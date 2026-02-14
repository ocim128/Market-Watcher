import { describe, expect, it } from 'vitest'
import type { BinanceKline } from '@/types'
import { evaluateSignalOutcome, scanForSignals } from './signal-generator'
import type { CandleStoreLike, UniverseEntry } from './types'

function createCandles(closes: number[]): BinanceKline[] {
  const start = Date.now() - closes.length * 3_600_000
  return closes.map((close, index) => {
    const openTime = start + index * 3_600_000
    return {
      openTime,
      open: String(close),
      high: String(close * 1.01),
      low: String(close * 0.99),
      close: String(close),
      volume: '500',
      closeTime: openTime + 3_599_999,
      quoteAssetVolume: '0',
      numberOfTrades: 10,
      takerBuyBaseVolume: '0',
      takerBuyQuoteVolume: '0',
    }
  })
}

class MockStore implements CandleStoreLike {
  constructor(private readonly map: Map<string, BinanceKline[]>) {}

  async saveCandles(): Promise<number> {
    return 0
  }

  async getCandles(symbol: string, interval: string): Promise<BinanceKline[]> {
    return this.map.get(`${symbol}|${interval}`) ?? []
  }

  async getLatestTimestamp(): Promise<number | null> {
    return null
  }

  async clearSymbol(): Promise<void> {
    return
  }
}

describe('signal-generator', () => {
  it('scans universe and emits oversold crossover signals', async () => {
    const closes = [
      ...Array.from({ length: 50 }, (_, i) => 120 + i * 0.5),
      142,
      139,
      136,
      132,
      128,
      124,
      120,
      116,
      112,
      108,
      106,
      104,
      102,
    ]

    const candles = createCandles(closes)
    const store = new MockStore(new Map([['SOLUSDT|1h', candles]]))
    const universe: UniverseEntry[] = [
      {
        symbol: 'SOLUSDT',
        perf3m: 40,
        perf6m: 80,
        perf12m: 140,
        criteriasMet: 3,
        rank: 1,
        volume24h: 1_000_000,
        currentPrice: closes[closes.length - 1],
        score: 0,
      },
    ]

    const signals = await scanForSignals(universe, store, undefined, {
      interval: '1h',
      rsiPeriod: 14,
      rsiThreshold: 30,
      lookbackBars: 30,
    })

    expect(signals.length).toBeGreaterThan(0)
    expect(signals[0].symbol).toBe('SOLUSDT')
    expect(signals[0].rating).toBeGreaterThanOrEqual(0)
    expect(signals[0].rating).toBeLessThanOrEqual(100)
  })

  it('evaluates signal outcome with take-profit hit', () => {
    const candles = createCandles([100, 101, 102, 104, 105])
    const signal = {
      id: 's1',
      symbol: 'BTCUSDT',
      timestamp: candles[0].openTime,
      rsi: 28,
      price: 100,
      rating: 80,
      meanReversionDist: 2,
      volume24hRank: 1,
      momentum3m: 35,
    }

    const evaluated = evaluateSignalOutcome(signal, candles, 3, 10)

    expect(evaluated.outcome).toBe('tp')
    expect(evaluated.pnlPercent).toBeGreaterThan(0)
  })
})
