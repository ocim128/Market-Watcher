import { fetchKlinesSmart } from '@/lib/binance'
import type { BinanceKline } from '@/types'
import { getCandleStore } from './candle-store'
import type { CandleDownloadSummary, CandleStoreLike } from './types'

const MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000

function intervalToMs(interval: string): number {
  const match = interval.match(/^(\d+)([mhdw])$/i)
  if (!match) {
    return 60_000
  }

  const value = Number(match[1])
  const unit = match[2].toLowerCase()

  if (unit === 'm') {
    return value * 60_000
  }
  if (unit === 'h') {
    return value * 3_600_000
  }
  if (unit === 'd') {
    return value * 86_400_000
  }
  return value * 7 * 86_400_000
}

function calcBarsForMonths(months: number, interval: string): number {
  const clampedMonths = Math.max(1, Math.min(24, months))
  return Math.ceil((clampedMonths * MONTH_IN_MS) / intervalToMs(interval))
}

interface DownloadOptions {
  batchSize?: number
  delayMs?: number
  maxIncrementalBars?: number
  onProgress?: (done: number, total: number, symbol: string) => void
}

export class CandleDownloader {
  constructor(private readonly candleStore: CandleStoreLike = getCandleStore()) {}

  async downloadFullHistory(
    symbol: string,
    interval: string,
    months: number = 12,
    options: DownloadOptions = {}
  ): Promise<CandleDownloadSummary> {
    const totalBars = calcBarsForMonths(months, interval)
    const candles = await fetchKlinesSmart(
      symbol,
      interval,
      totalBars,
      options.batchSize ?? 1000,
      options.delayMs ?? 50
    )

    const saved = await this.candleStore.saveCandles(symbol, interval, candles)
    const latestTimestamp = candles.length > 0 ? candles[candles.length - 1].openTime : null

    return {
      symbol,
      fetched: candles.length,
      saved,
      latestTimestamp,
    }
  }

  async updateCandles(
    symbol: string,
    interval: string,
    options: DownloadOptions = {}
  ): Promise<CandleDownloadSummary> {
    const latestTimestamp = await this.candleStore.getLatestTimestamp(symbol, interval)

    if (latestTimestamp === null) {
      return this.downloadFullHistory(symbol, interval, 12, options)
    }

    const now = Date.now()
    const barsNeeded = Math.ceil((now - latestTimestamp) / intervalToMs(interval)) + 2
    const maxIncrementalBars = options.maxIncrementalBars ?? 5_000

    if (barsNeeded > maxIncrementalBars) {
      return this.downloadFullHistory(symbol, interval, 12, options)
    }

    const fetched = await fetchKlinesSmart(
      symbol,
      interval,
      Math.max(50, barsNeeded),
      options.batchSize ?? 1000,
      options.delayMs ?? 50
    )

    const newCandles = fetched.filter(candle => candle.openTime > latestTimestamp)
    const saved = await this.candleStore.saveCandles(symbol, interval, newCandles)

    return {
      symbol,
      fetched: fetched.length,
      saved,
      latestTimestamp: fetched.length > 0 ? fetched[fetched.length - 1].openTime : latestTimestamp,
    }
  }

  async downloadUniverse(
    symbols: string[],
    interval: string,
    options: DownloadOptions & { concurrency?: number; months?: number; incremental?: boolean } = {}
  ): Promise<CandleDownloadSummary[]> {
    const concurrency = Math.max(1, options.concurrency ?? 5)
    const summaries: CandleDownloadSummary[] = []

    for (let i = 0; i < symbols.length; i += concurrency) {
      const batch = symbols.slice(i, i + concurrency)

      const results = await Promise.allSettled(
        batch.map(symbol =>
          options.incremental
            ? this.updateCandles(symbol, interval, options)
            : this.downloadFullHistory(symbol, interval, options.months ?? 12, options)
        )
      )

      results.forEach((result, index) => {
        const symbol = batch[index]
        if (result.status === 'fulfilled') {
          summaries.push(result.value)
        } else {
          summaries.push({
            symbol,
            fetched: 0,
            saved: 0,
            latestTimestamp: null,
          })
        }
      })

      const done = Math.min(i + concurrency, symbols.length)
      options.onProgress?.(done, symbols.length, batch[batch.length - 1] ?? '')

      if (options.delayMs && i + concurrency < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, options.delayMs))
      }
    }

    return summaries
  }

  async getCandles(symbol: string, interval: string): Promise<BinanceKline[]> {
    return this.candleStore.getCandles(symbol, interval)
  }
}

export function createCandleDownloader(candleStore?: CandleStoreLike): CandleDownloader {
  return new CandleDownloader(candleStore)
}

export { intervalToMs, calcBarsForMonths }
