import { get24hrTickers } from '@/lib/binance'
import type { Binance24hrTicker, BinanceKline } from '@/types'
import { createCandleDownloader, type CandleDownloader } from './candle-downloader'
import {
  DEFAULT_SCANNER_SETTINGS,
  type ScannerThresholds,
  type UniverseEntry,
  type UniverseSettings,
  type UniverseSnapshot,
} from './types'

const DEFAULT_EXCLUSIONS = new Set(['USDCUSDT', 'BUSDUSDT', 'TUSDUSDT', 'FDUSDUSDT', 'USDPUSDT'])

function toNumber(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculatePerformancePercent(currentPrice: number, historicalPrice: number): number {
  if (!Number.isFinite(currentPrice) || !Number.isFinite(historicalPrice) || historicalPrice <= 0) {
    return 0
  }

  return ((currentPrice - historicalPrice) / historicalPrice) * 100
}

function findPriceAtOrBefore(candles: BinanceKline[], targetTime: number): number | null {
  const firstClose = Number(candles[0]?.close)

  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].openTime <= targetTime) {
      const close = Number(candles[i].close)
      return Number.isFinite(close) ? close : null
    }
  }

  // If historical window is slightly shorter than target (e.g., 360d vs 365d),
  // use earliest available candle as a practical fallback.
  return Number.isFinite(firstClose) ? firstClose : null
}

export function scoreUniverseEntry(
  entry: Pick<UniverseEntry, 'perf3m' | 'perf6m' | 'perf12m' | 'criteriasMet'>
): number {
  const performanceSum = entry.perf3m + entry.perf6m + entry.perf12m
  return entry.criteriasMet * 10_000 + performanceSum
}

function meetsThreshold(perf: number, threshold: number): boolean {
  return Number.isFinite(perf) && perf >= threshold
}

export function buildUniverseEntryFromCandles(
  symbol: string,
  candles: BinanceKline[],
  volume24h: number,
  thresholds: ScannerThresholds,
  now: number = Date.now()
): UniverseEntry | null {
  if (candles.length < 24 * 30 * 3) {
    return null
  }

  const latestClose = Number(candles[candles.length - 1].close)
  if (!Number.isFinite(latestClose) || latestClose <= 0) {
    return null
  }

  const price3m = findPriceAtOrBefore(candles, now - 90 * 24 * 60 * 60 * 1000)
  const price6m = findPriceAtOrBefore(candles, now - 180 * 24 * 60 * 60 * 1000)
  const price12m = findPriceAtOrBefore(candles, now - 365 * 24 * 60 * 60 * 1000)

  if (price3m === null || price6m === null || price12m === null) {
    return null
  }

  const perf3m = calculatePerformancePercent(latestClose, price3m)
  const perf6m = calculatePerformancePercent(latestClose, price6m)
  const perf12m = calculatePerformancePercent(latestClose, price12m)

  const criteria3m = meetsThreshold(perf3m, thresholds.perf3m)
  const criteria6m = meetsThreshold(perf6m, thresholds.perf6m)
  const criteria12m = meetsThreshold(perf12m, thresholds.perf12m)
  const criteriasMet = [criteria3m, criteria6m, criteria12m].filter(Boolean).length

  if (criteriasMet < 1) {
    return null
  }

  const entry: UniverseEntry = {
    symbol,
    perf3m,
    perf6m,
    perf12m,
    criteriasMet,
    rank: 0,
    volume24h,
    currentPrice: latestClose,
    score: 0,
  }

  entry.score = scoreUniverseEntry(entry)
  return entry
}

export function rankUniverseEntries(entries: UniverseEntry[]): UniverseEntry[] {
  const ranked = [...entries].sort((a, b) => {
    if (b.criteriasMet !== a.criteriasMet) {
      return b.criteriasMet - a.criteriasMet
    }

    if (b.score !== a.score) {
      return b.score - a.score
    }

    return b.volume24h - a.volume24h
  })

  return ranked.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }))
}

function normalizeSettings(settings?: Partial<UniverseSettings>): UniverseSettings {
  return {
    ...DEFAULT_SCANNER_SETTINGS,
    ...settings,
    thresholds: {
      ...DEFAULT_SCANNER_SETTINGS.thresholds,
      ...(settings?.thresholds ?? {}),
    },
    exclusions: settings?.exclusions ?? DEFAULT_SCANNER_SETTINGS.exclusions,
  }
}

function selectUniverseCandidates(
  tickers: Binance24hrTicker[],
  settings: UniverseSettings
): Array<{ symbol: string; volume24h: number }> {
  const exclusionSet = new Set([
    ...Array.from(DEFAULT_EXCLUSIONS),
    ...settings.exclusions.map(symbol => symbol.toUpperCase()),
  ])

  return tickers
    .filter(ticker => ticker.symbol.endsWith('USDT'))
    .filter(ticker => !exclusionSet.has(ticker.symbol.toUpperCase()))
    .map(ticker => ({
      symbol: ticker.symbol,
      volume24h: toNumber(ticker.quoteVolume),
    }))
    .filter(item => item.volume24h > 0)
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, settings.pairLimit)
}

interface BuildUniverseOptions {
  settings?: Partial<UniverseSettings>
  incremental?: boolean
  onProgress?: (done: number, total: number, symbol: string) => void
}

export class UniverseBuilder {
  constructor(private readonly downloader: CandleDownloader = createCandleDownloader()) {}

  async build(options: BuildUniverseOptions = {}): Promise<UniverseSnapshot> {
    const settings = normalizeSettings(options.settings)
    const tickers = await get24hrTickers()
    const candidates = selectUniverseCandidates(tickers, settings)

    await this.downloader.downloadUniverse(
      candidates.map(candidate => candidate.symbol),
      settings.interval,
      {
        incremental: options.incremental ?? true,
        months: 12,
        concurrency: 5,
        delayMs: 50,
        onProgress: options.onProgress,
      }
    )

    const entries: UniverseEntry[] = []
    for (const candidate of candidates) {
      const candles = await this.downloader.getCandles(candidate.symbol, settings.interval)
      const entry = buildUniverseEntryFromCandles(
        candidate.symbol,
        candles,
        candidate.volume24h,
        settings.thresholds
      )

      if (entry) {
        entries.push(entry)
      }
    }

    return {
      updatedAt: Date.now(),
      settings,
      entries: rankUniverseEntries(entries),
    }
  }
}

export function createUniverseBuilder(downloader?: CandleDownloader): UniverseBuilder {
  return new UniverseBuilder(downloader)
}

export { normalizeSettings, selectUniverseCandidates }
