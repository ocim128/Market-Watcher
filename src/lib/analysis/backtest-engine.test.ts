import { describe, expect, it } from 'vitest'
import { runBacktest } from './backtest-engine'
import { DEFAULT_BACKTEST_CONFIG } from '@/types/backtest-types'

function createSyntheticPairData(length: number): { primary: number[]; secondary: number[] } {
  const primary: number[] = []
  const secondary: number[] = []

  for (let i = 0; i < length; i++) {
    const trend = 100 + i * 0.08
    const seasonality = Math.sin(i / 6) * 0.7
    const primaryPrice = trend + seasonality
    const shock = i % 90 < 6 ? (6 - (i % 90)) * 0.02 : 0
    const spread = Math.sin(i / 12) * 0.01 + shock

    primary.push(primaryPrice)
    secondary.push(primaryPrice * Math.exp(-spread))
  }

  return { primary, secondary }
}

describe('runBacktest', () => {
  it('aligns to overlapping price windows when series lengths differ', () => {
    const { primary, secondary } = createSyntheticPairData(360)

    const baseline = runBacktest(primary, secondary, 'PAIR', 'PRIMARY', {
      ...DEFAULT_BACKTEST_CONFIG,
      entrySpreadThreshold: 2.5,
      minCorrelation: 0.5,
      takeProfitPercent: 0.2,
      stopLossPercent: 0.2,
    })

    const prefixedPrimary = [...Array.from({ length: 40 }, (_, i) => 70 + i * 0.05), ...primary]
    const shifted = runBacktest(prefixedPrimary, secondary, 'PAIR', 'PRIMARY', {
      ...DEFAULT_BACKTEST_CONFIG,
      entrySpreadThreshold: 2.5,
      minCorrelation: 0.5,
      takeProfitPercent: 0.2,
      stopLossPercent: 0.2,
    })

    expect(shifted.summary.totalTrades).toBe(baseline.summary.totalTrades)
    expect(shifted.summary.totalProfitPercent).toBeCloseTo(baseline.summary.totalProfitPercent, 8)
    expect(shifted.summary.winRate).toBeCloseTo(baseline.summary.winRate, 8)
  })

  it('drops invalid prices before log-spread calculations', () => {
    const { primary, secondary } = createSyntheticPairData(260)
    const dirtyPrimary = [...primary]
    const dirtySecondary = [...secondary]

    dirtyPrimary[30] = 0
    dirtySecondary[31] = -5
    dirtyPrimary[32] = Number.NaN
    dirtySecondary[33] = Number.POSITIVE_INFINITY

    const result = runBacktest(dirtyPrimary, dirtySecondary, 'PAIR', 'PRIMARY', {
      ...DEFAULT_BACKTEST_CONFIG,
      minCorrelation: -1,
      entrySpreadThreshold: 2.5,
      takeProfitPercent: 0.2,
      stopLossPercent: 0.2,
    })

    expect(Number.isFinite(result.summary.totalProfitPercent)).toBe(true)
    expect(result.trades.every(trade => Number.isFinite(trade.profitPercent))).toBe(true)
  })
})
