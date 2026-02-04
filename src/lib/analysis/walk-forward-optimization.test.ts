import { describe, it, expect } from 'vitest'
import { buildPriceData, optimizeParameters } from './walk-forward-optimization'
import { DEFAULT_BACKTEST_CONFIG } from '@/types/backtest-types'

function createSyntheticPairData(length: number) {
  const primary: number[] = []
  const secondary: number[] = []

  for (let i = 0; i < length; i++) {
    const trend = 100 + i * 0.03
    const seasonality = Math.sin(i / 12) * 0.8
    const primaryPrice = trend + seasonality

    const shockPhase = i % 140
    const shockSign = Math.floor(i / 140) % 2 === 0 ? 1 : -1
    const shock = shockPhase < 8 ? (8 - shockPhase) * 0.01 * shockSign : 0
    const spread = Math.sin(i / 9) * 0.01 + shock

    primary.push(primaryPrice)
    secondary.push(primaryPrice * Math.exp(-spread))
  }

  return buildPriceData(primary, secondary)
}

describe('buildPriceData', () => {
  it('aligns both close arrays to the shortest length', () => {
    const primary = [1, 2, 3, 4]
    const secondary = [10, 11]
    const data = buildPriceData(primary, secondary)

    expect(data).toEqual([
      { primaryClose: 3, secondaryClose: 10 },
      { primaryClose: 4, secondaryClose: 11 },
    ])
  })
})

describe('optimizeParameters', () => {
  it('returns fallback defaults when there is not enough data', () => {
    const shortData = createSyntheticPairData(200)
    const optimized = optimizeParameters(shortData, 500, 120)

    expect(optimized.windowsEvaluated).toBe(0)
    expect(optimized.config).toEqual(DEFAULT_BACKTEST_CONFIG)
    expect(optimized.confidence).toBe('low')
  })

  it('runs walk-forward windows and returns a valid config', () => {
    const data = createSyntheticPairData(1800)
    const optimized = optimizeParameters(data, 500, 120)

    expect(optimized.windowsEvaluated).toBeGreaterThan(0)
    expect(optimized.config.entrySpreadThreshold).toBeGreaterThan(0)
    expect(optimized.config.minCorrelation).toBeGreaterThan(0)
    expect(optimized.walkForwardTrades).toBeGreaterThanOrEqual(0)
    expect(optimized.windowResults).toHaveLength(optimized.windowsEvaluated)
  })
})
