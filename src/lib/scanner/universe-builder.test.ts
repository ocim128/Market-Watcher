import { describe, expect, it } from 'vitest'
import type { BinanceKline } from '@/types'
import {
  buildUniverseEntryFromCandles,
  calculatePerformancePercent,
  rankUniverseEntries,
  scoreUniverseEntry,
} from './universe-builder'

function generateHourlyCandles(
  total: number,
  startPrice: number,
  endPrice: number
): BinanceKline[] {
  const startTime = Date.now() - total * 3_600_000
  const candles: BinanceKline[] = []

  for (let i = 0; i < total; i++) {
    const ratio = i / Math.max(1, total - 1)
    const price = startPrice + (endPrice - startPrice) * ratio
    const openTime = startTime + i * 3_600_000

    candles.push({
      openTime,
      open: String(price * 0.998),
      high: String(price * 1.002),
      low: String(price * 0.996),
      close: String(price),
      volume: '1000',
      closeTime: openTime + 3_599_999,
      quoteAssetVolume: '0',
      numberOfTrades: 50,
      takerBuyBaseVolume: '0',
      takerBuyQuoteVolume: '0',
    })
  }

  return candles
}

describe('universe-builder', () => {
  it('calculates performance percent safely', () => {
    expect(calculatePerformancePercent(120, 100)).toBeCloseTo(20)
    expect(calculatePerformancePercent(120, 0)).toBe(0)
  })

  it('builds a universe entry when thresholds are met', () => {
    const candles = generateHourlyCandles(9_000, 100, 400)

    const entry = buildUniverseEntryFromCandles(
      'SOLUSDT',
      candles,
      123_000_000,
      { perf3m: 25, perf6m: 45, perf12m: 75 },
      Date.now()
    )

    expect(entry).not.toBeNull()
    expect(entry?.symbol).toBe('SOLUSDT')
    expect(entry?.criteriasMet).toBeGreaterThanOrEqual(1)
    expect(entry?.score).toBeCloseTo(scoreUniverseEntry(entry!))
  })

  it('ranks entries by criteria count and score', () => {
    const ranked = rankUniverseEntries([
      {
        symbol: 'A',
        perf3m: 30,
        perf6m: 40,
        perf12m: 60,
        criteriasMet: 1,
        rank: 0,
        volume24h: 100,
        currentPrice: 10,
        score: 10_130,
      },
      {
        symbol: 'B',
        perf3m: 35,
        perf6m: 60,
        perf12m: 90,
        criteriasMet: 3,
        rank: 0,
        volume24h: 100,
        currentPrice: 10,
        score: 30_185,
      },
    ])

    expect(ranked[0].symbol).toBe('B')
    expect(ranked[0].rank).toBe(1)
    expect(ranked[1].rank).toBe(2)
  })

  it('uses earliest available candle when 12m target is slightly out of range', () => {
    const candles = generateHourlyCandles(8_640, 100, 280) // ~360 days of 1h candles

    const entry = buildUniverseEntryFromCandles(
      'ETHUSDT',
      candles,
      456_000_000,
      { perf3m: 25, perf6m: 45, perf12m: 75 },
      Date.now()
    )

    expect(entry).not.toBeNull()
    expect(entry?.criteriasMet).toBeGreaterThan(0)
  })
})
