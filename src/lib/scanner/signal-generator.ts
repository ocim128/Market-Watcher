import { clamp, mean } from '@/lib/analysis/statistics'
import type { BinanceKline } from '@/types'
import { calculateRSI, detectRSICrossover } from './rsi-calculator'
import type {
  CandleStoreLike,
  MarketContext,
  Signal,
  SignalHistoryRecord,
  UniverseEntry,
} from './types'

interface SignalScanOptions {
  interval?: string
  rsiPeriod?: number
  rsiThreshold?: number
  lookbackBars?: number
  maxSignals?: number
}

interface SignalContext {
  entry: UniverseEntry
  universeSize: number
  rsiThreshold: number
}

function getClosePrices(candles: BinanceKline[]): number[] {
  return candles
    .map(candle => Number(candle.close))
    .filter(value => Number.isFinite(value) && value > 0)
}

function calculateMeanReversionDistance(
  closes: number[],
  index: number,
  window: number = 50
): number {
  const start = Math.max(0, index - window + 1)
  const windowSlice = closes.slice(start, index + 1)
  if (windowSlice.length === 0) {
    return 0
  }

  const avg = mean(windowSlice)
  if (!Number.isFinite(avg) || avg <= 0) {
    return 0
  }

  const current = closes[index]
  return ((avg - current) / avg) * 100
}

function getVolumeRankScore(rank: number, total: number): number {
  if (total <= 1) {
    return 100
  }
  const normalized = 1 - (rank - 1) / (total - 1)
  return clamp(normalized * 100, 0, 100)
}

function getMomentumScore(entry: UniverseEntry): number {
  const weighted = entry.perf3m * 0.5 + entry.perf6m * 0.3 + entry.perf12m * 0.2
  return clamp(weighted / 2.5, 0, 100)
}

function getRsiDepthScore(rsi: number, threshold: number): number {
  return clamp(((threshold - rsi) / Math.max(1, threshold)) * 100, 0, 100)
}

export function rateSignal(
  signal: Signal,
  context: SignalContext,
  marketContext?: MarketContext
): number {
  const meanReversionScore = clamp(signal.meanReversionDist * 12, 0, 100)
  const volumeScore = getVolumeRankScore(context.entry.rank, context.universeSize)
  const momentumScore = getMomentumScore(context.entry)
  const rsiScore = getRsiDepthScore(signal.rsi, context.rsiThreshold)

  const rawScore =
    meanReversionScore * 0.35 + volumeScore * 0.2 + momentumScore * 0.25 + rsiScore * 0.2

  const breadthAdjustment = marketContext ? clamp(marketContext.marketBreadth * 10, -5, 5) : 0
  return Math.round(clamp(rawScore + breadthAdjustment, 0, 100))
}

export async function scanForSignals(
  universe: UniverseEntry[],
  candleStore: CandleStoreLike,
  marketContext?: MarketContext,
  options: SignalScanOptions = {}
): Promise<Signal[]> {
  const interval = options.interval ?? '1h'
  const rsiPeriod = options.rsiPeriod ?? 14
  const rsiThreshold = options.rsiThreshold ?? 30
  const lookbackBars = options.lookbackBars ?? 24

  const signals: Signal[] = []

  for (const entry of universe) {
    const candles = await candleStore.getCandles(entry.symbol, interval)
    if (candles.length < rsiPeriod + 5) {
      continue
    }

    const closes = getClosePrices(candles)
    if (closes.length !== candles.length) {
      continue
    }

    const rsiValues = calculateRSI(closes, rsiPeriod)
    const events = detectRSICrossover(rsiValues, rsiThreshold).filter(event => event.crossedBelow)

    for (const event of events) {
      if (event.index < closes.length - lookbackBars) {
        continue
      }

      const price = closes[event.index]
      const timestamp = candles[event.index]?.openTime
      if (!Number.isFinite(price) || !Number.isFinite(timestamp)) {
        continue
      }

      const signal: Signal = {
        id: `${entry.symbol}-${timestamp}`,
        symbol: entry.symbol,
        timestamp,
        rsi: event.to,
        price,
        rating: 0,
        meanReversionDist: calculateMeanReversionDistance(closes, event.index),
        volume24hRank: entry.rank,
        momentum3m: entry.perf3m,
      }

      signal.rating = rateSignal(
        signal,
        { entry, universeSize: Math.max(universe.length, 1), rsiThreshold },
        marketContext
      )

      signals.push(signal)
    }
  }

  const sortedSignals = signals.sort((a, b) => {
    if (b.rating !== a.rating) {
      return b.rating - a.rating
    }
    return b.timestamp - a.timestamp
  })

  if (options.maxSignals && options.maxSignals > 0) {
    return sortedSignals.slice(0, options.maxSignals)
  }

  return sortedSignals
}

export function evaluateSignalOutcome(
  signal: Signal,
  candles: BinanceKline[],
  takeProfitPercent: number = 3,
  maxHoldBars: number = 10
): SignalHistoryRecord {
  const entryIndex = candles.findIndex(candle => candle.openTime === signal.timestamp)

  if (entryIndex < 0 || entryIndex >= candles.length - 1) {
    return {
      ...signal,
      outcome: 'open',
      holdBars: 0,
      pnlPercent: 0,
      evaluatedAt: Date.now(),
    }
  }

  const entryPrice = signal.price
  const target = entryPrice * (1 + takeProfitPercent / 100)

  let exitPrice = entryPrice
  let holdBars = 0
  let outcome: SignalHistoryRecord['outcome'] = 'open'

  const endIndex = Math.min(candles.length - 1, entryIndex + maxHoldBars)
  for (let i = entryIndex + 1; i <= endIndex; i++) {
    holdBars = i - entryIndex
    const high = Number(candles[i].high)
    const close = Number(candles[i].close)

    if (Number.isFinite(high) && high >= target) {
      outcome = 'tp'
      exitPrice = target
      break
    }

    exitPrice = Number.isFinite(close) ? close : exitPrice
  }

  if (outcome === 'open' && holdBars >= maxHoldBars) {
    outcome = 'timeout'
  }

  const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100

  return {
    ...signal,
    outcome,
    holdBars,
    pnlPercent: Number.isFinite(pnlPercent) ? pnlPercent : 0,
    evaluatedAt: Date.now(),
  }
}
