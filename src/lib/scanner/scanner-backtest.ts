import type { BinanceKline } from '@/types'
import { calculateRSI, detectRSICrossover } from './rsi-calculator'
import {
  DEFAULT_MOMENTUM_BACKTEST_CONFIG,
  type CandleStoreLike,
  type MomentumBacktestConfig,
  type ScannerBacktestResult,
  type ScannerBacktestStats,
  type ScannerBacktestTrade,
  type UniverseEntry,
} from './types'

function toClose(candle: BinanceKline): number {
  const value = Number(candle.close)
  return Number.isFinite(value) ? value : 0
}

function toHigh(candle: BinanceKline): number {
  const value = Number(candle.high)
  return Number.isFinite(value) ? value : 0
}

function toLow(candle: BinanceKline): number {
  const value = Number(candle.low)
  return Number.isFinite(value) ? value : 0
}

function buildStats(trades: ScannerBacktestTrade[]): ScannerBacktestStats {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winners: 0,
      losers: 0,
      winRate: 0,
      avgHoldBars: 0,
      avgPnlPercent: 0,
      totalPnlPercent: 0,
      grossProfitPercent: 0,
      grossLossPercent: 0,
      profitFactor: 0,
      expectancyPercent: 0,
    }
  }

  const winningTrades = trades.filter(trade => trade.pnlPercent > 0)
  const losingTrades = trades.filter(trade => trade.pnlPercent <= 0)
  const winners = winningTrades.length
  const losers = trades.length - winners
  const totalPnlPercent = trades.reduce((sum, trade) => sum + trade.pnlPercent, 0)
  const avgHoldBars = trades.reduce((sum, trade) => sum + trade.holdBars, 0) / trades.length
  const grossProfitPercent = winningTrades.reduce((sum, trade) => sum + trade.pnlPercent, 0)
  const grossLossPercent = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.pnlPercent, 0))
  const avgWin = winners > 0 ? grossProfitPercent / winners : 0
  const avgLoss = losers > 0 ? grossLossPercent / losers : 0
  const winProbability = winners / trades.length
  const lossProbability = losers / trades.length
  const expectancyPercent = winProbability * avgWin - lossProbability * avgLoss
  const profitFactor =
    grossLossPercent > 0
      ? grossProfitPercent / grossLossPercent
      : grossProfitPercent > 0
        ? Infinity
        : 0

  return {
    totalTrades: trades.length,
    winners,
    losers,
    winRate: (winners / trades.length) * 100,
    avgHoldBars,
    avgPnlPercent: totalPnlPercent / trades.length,
    totalPnlPercent,
    grossProfitPercent,
    grossLossPercent,
    profitFactor,
    expectancyPercent,
  }
}

export function runScannerBacktestForCandles(
  symbol: string,
  candles: BinanceKline[],
  config: Partial<MomentumBacktestConfig> = {}
): ScannerBacktestResult {
  const fullConfig: MomentumBacktestConfig = {
    ...DEFAULT_MOMENTUM_BACKTEST_CONFIG,
    ...config,
  }

  if (candles.length < fullConfig.rsiPeriod + 20) {
    return {
      symbol,
      trades: [],
      stats: buildStats([]),
    }
  }

  const closes = candles.map(toClose)
  if (closes.some(close => close <= 0)) {
    return {
      symbol,
      trades: [],
      stats: buildStats([]),
    }
  }

  const rsi = calculateRSI(closes, fullConfig.rsiPeriod)

  const trades: ScannerBacktestTrade[] = []
  const crossoverIndices = new Set(
    detectRSICrossover(rsi, fullConfig.rsiThreshold)
      .filter(event => event.crossedBelow)
      .map(event => event.index)
  )

  let inPosition = false
  let entryIndex = -1
  let entryPrice = 0
  let takeProfitPrice = 0
  let stopLossPrice = 0
  let lastExitIndex = -1_000_000

  for (let i = 1; i < candles.length; i++) {
    if (inPosition) {
      const high = toHigh(candles[i])
      const low = toLow(candles[i])
      const close = closes[i]
      const reachedMaxHold = i - entryIndex >= fullConfig.maxHoldBars
      const isLastBar = i === candles.length - 1

      let exitReason: ScannerBacktestTrade['exitReason'] | null = null
      let exitPrice = close

      // Conservative intrabar assumption: stop loss checked before take profit.
      if (low <= stopLossPrice) {
        exitReason = 'stop_loss'
        exitPrice = stopLossPrice
      } else if (high >= takeProfitPrice) {
        exitReason = 'take_profit'
        exitPrice = takeProfitPrice
      } else if (reachedMaxHold) {
        exitReason = 'max_hold'
        exitPrice = close
      } else if (isLastBar) {
        exitReason = 'end_of_data'
        exitPrice = close
      }

      if (exitReason) {
        const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100

        trades.push({
          symbol,
          entryTime: candles[entryIndex].openTime,
          exitTime: candles[i].openTime,
          entryPrice,
          exitPrice,
          holdBars: i - entryIndex,
          exitReason,
          pnlPercent,
        })

        inPosition = false
        lastExitIndex = i
      }

      continue
    }

    const cooldownReady = i > lastExitIndex + fullConfig.cooldownBars
    if (!cooldownReady || !crossoverIndices.has(i)) {
      continue
    }

    const nextEntryPrice = closes[i]
    if (!Number.isFinite(nextEntryPrice) || nextEntryPrice <= 0) {
      continue
    }

    inPosition = true
    entryIndex = i
    entryPrice = nextEntryPrice
    takeProfitPrice = entryPrice * (1 + fullConfig.takeProfitPercent / 100)
    stopLossPrice = entryPrice * (1 - fullConfig.stopLossPercent / 100)
  }

  return {
    symbol,
    trades,
    stats: buildStats(trades),
  }
}

export async function runScannerBacktest(
  universe: UniverseEntry[],
  candleStore: CandleStoreLike,
  interval: string = '1h',
  config: Partial<MomentumBacktestConfig> = {}
): Promise<{
  results: ScannerBacktestResult[]
  aggregate: ScannerBacktestStats
}> {
  const results: ScannerBacktestResult[] = []

  for (const entry of universe) {
    const candles = await candleStore.getCandles(entry.symbol, interval)
    results.push(runScannerBacktestForCandles(entry.symbol, candles, config))
  }

  const aggregateTrades = results.flatMap(result => result.trades)

  return {
    results,
    aggregate: buildStats(aggregateTrades),
  }
}
