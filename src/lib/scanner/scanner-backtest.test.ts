import { describe, expect, it } from 'vitest'
import type { BinanceKline } from '@/types'
import { runScannerBacktestForCandles } from './scanner-backtest'

function createCandles(closes: number[]): BinanceKline[] {
  const start = Date.UTC(2025, 0, 1)

  return closes.map((close, index) => {
    const openTime = start + index * 3_600_000
    return {
      openTime,
      open: String(close),
      high: String(close * 1.005),
      low: String(close * 0.995),
      close: String(close),
      volume: '1000',
      closeTime: openTime + 3_599_999,
      quoteAssetVolume: '0',
      numberOfTrades: 100,
      takerBuyBaseVolume: '0',
      takerBuyQuoteVolume: '0',
    }
  })
}

describe('scanner-backtest', () => {
  it('applies stop-loss and reports profit factor/expectancy', () => {
    const closes = [
      100, 101, 102, 103, 104, 103, 102, 101, 100, 99, 98, 97, 96, 95, 94, 93, 92, 91, 90, 89, 88,
      89, 90, 91, 92, 93, 94, 95,
    ]

    const result = runScannerBacktestForCandles('TESTUSDT', createCandles(closes), {
      rsiPeriod: 5,
      rsiThreshold: 45,
      takeProfitPercent: 20,
      stopLossPercent: 1,
      maxHoldBars: 10,
      cooldownBars: 0,
    })

    expect(result.trades.length).toBeGreaterThan(0)
    expect(result.trades.some(trade => trade.exitReason === 'stop_loss')).toBe(true)
    expect(Number.isFinite(result.stats.expectancyPercent)).toBe(true)
    expect(result.stats.profitFactor).toBeGreaterThanOrEqual(0)
  })

  it('enforces one position per symbol and cooldown bars between entries', () => {
    const closes = [
      100, 101, 102, 103, 102, 101, 100, 99, 98, 99, 100, 101, 100, 99, 98, 97, 98, 99, 100, 101,
      100, 99, 98, 97, 98, 99, 100, 101, 102, 101, 100, 99, 98, 97,
    ]

    const candles = createCandles(closes)
    const result = runScannerBacktestForCandles('TESTUSDT', candles, {
      rsiPeriod: 3,
      rsiThreshold: 45,
      takeProfitPercent: 3,
      stopLossPercent: 3,
      maxHoldBars: 1,
      cooldownBars: 3,
    })

    for (let i = 1; i < result.trades.length; i++) {
      const prev = result.trades[i - 1]
      const current = result.trades[i]

      // no overlap (single open trade per symbol)
      expect(current.entryTime).toBeGreaterThan(prev.exitTime)

      // cooldown enforced: with 1h candles and cooldown=3, entry must be at least 4 bars after exit
      const barsBetween = Math.round((current.entryTime - prev.exitTime) / 3_600_000)
      expect(barsBetween).toBeGreaterThanOrEqual(4)
    }
  })
})
