import { describe, it, expect } from 'vitest'
import {
  mean,
  standardDeviation,
  pearsonCorrelation,
  clamp,
  isFinite,
  sumOfSquares,
  calculateReturns,
  calculateSpread,
  calculateRatio,
  calculateZScore,
} from './statistics'

describe('mean', () => {
  it('calculates mean of positive numbers', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3)
  })

  it('calculates mean with negative numbers', () => {
    expect(mean([-2, -1, 0, 1, 2])).toBe(0)
  })

  it('returns 0 for empty array', () => {
    expect(mean([])).toBe(0)
  })

  it('handles single value', () => {
    expect(mean([42])).toBe(42)
  })

  it('handles decimal numbers', () => {
    expect(mean([1.5, 2.5, 3.5])).toBe(2.5)
  })
})

describe('standardDeviation', () => {
  it('calculates standard deviation correctly', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9]
    const result = standardDeviation(values)
    expect(result).toBeCloseTo(2, 1)
  })

  it('returns 0 for less than 2 values', () => {
    expect(standardDeviation([5])).toBe(0)
    expect(standardDeviation([])).toBe(0)
  })

  it('uses provided mean when given', () => {
    const values = [1, 2, 3, 4, 5]
    const result = standardDeviation(values, 3)
    expect(result).toBeCloseTo(Math.sqrt(2), 5)
  })

  it('returns 0 for identical values', () => {
    expect(standardDeviation([5, 5, 5, 5])).toBe(0)
  })
})

describe('pearsonCorrelation', () => {
  it('returns 1 for perfectly correlated arrays', () => {
    const a = [1, 2, 3, 4, 5]
    const b = [2, 4, 6, 8, 10]
    expect(pearsonCorrelation(a, b)).toBeCloseTo(1, 5)
  })

  it('returns -1 for perfectly anti-correlated arrays', () => {
    const a = [1, 2, 3, 4, 5]
    const b = [10, 8, 6, 4, 2]
    expect(pearsonCorrelation(a, b)).toBeCloseTo(-1, 5)
  })

  it('returns 0 for arrays with no correlation', () => {
    const a = [1, 2, 3]
    const b = [1, 1, 1]
    expect(pearsonCorrelation(a, b)).toBe(0)
  })

  it('returns 0 for less than 2 values', () => {
    expect(pearsonCorrelation([1], [2])).toBe(0)
    expect(pearsonCorrelation([], [])).toBe(0)
  })

  it('handles different length arrays', () => {
    const a = [1, 2, 3, 4, 5]
    const b = [1, 2, 3]
    expect(pearsonCorrelation(a, b)).toBeCloseTo(1, 5)
  })

  it('handles real price-like data', () => {
    const prices1 = [100, 101, 102, 101, 103, 104]
    const prices2 = [50, 50.5, 51, 50.5, 51.5, 52]
    const correlation = pearsonCorrelation(prices1, prices2)
    expect(correlation).toBeGreaterThan(0.9)
    expect(correlation).toBeLessThanOrEqual(1)
  })
})

describe('clamp', () => {
  it('returns value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('clamps value below minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('clamps value above maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5)
    expect(clamp(-15, -10, -1)).toBe(-10)
  })
})

describe('isFinite', () => {
  it('returns true for finite numbers', () => {
    expect(isFinite(42)).toBe(true)
    expect(isFinite(0)).toBe(true)
    expect(isFinite(-999.99)).toBe(true)
  })

  it('returns false for Infinity', () => {
    expect(isFinite(Infinity)).toBe(false)
    expect(isFinite(-Infinity)).toBe(false)
  })

  it('returns false for NaN', () => {
    expect(isFinite(NaN)).toBe(false)
  })
})

describe('sumOfSquares', () => {
  it('calculates sum of squares', () => {
    expect(sumOfSquares([1, 2, 3])).toBe(14) // 1 + 4 + 9
  })

  it('returns 0 for empty array', () => {
    expect(sumOfSquares([])).toBe(0)
  })

  it('handles negative numbers', () => {
    expect(sumOfSquares([-2, -3])).toBe(13) // 4 + 9
  })
})

describe('calculateReturns', () => {
  it('calculates log returns correctly', () => {
    const closes = [100, 110, 121]
    const returns = calculateReturns(closes)
    expect(returns).toHaveLength(2)
    expect(returns[0]).toBeCloseTo(Math.log(1.1), 5)
    expect(returns[1]).toBeCloseTo(Math.log(1.1), 5)
  })

  it('returns empty array for less than 2 values', () => {
    expect(calculateReturns([100])).toEqual([])
    expect(calculateReturns([])).toEqual([])
  })

  it('handles decreasing prices', () => {
    const closes = [100, 90, 81]
    const returns = calculateReturns(closes)
    expect(returns[0]).toBeLessThan(0)
    expect(returns[1]).toBeLessThan(0)
  })

  it('handles very small prices with epsilon protection', () => {
    const closes = [0.0000001, 0.0000002]
    const returns = calculateReturns(closes)
    expect(returns[0]).toBeDefined()
  })
})

describe('calculateSpread', () => {
  it('calculates log spread correctly', () => {
    const primary = [100, 110, 120]
    const secondary = [50, 55, 60]
    const spread = calculateSpread(primary, secondary)
    expect(spread).toHaveLength(3)
    expect(spread[0]).toBeCloseTo(Math.log(2), 5)
    expect(spread[1]).toBeCloseTo(Math.log(2), 5)
  })

  it('handles different length arrays', () => {
    const primary = [100, 110, 120]
    const secondary = [50, 55]
    const spread = calculateSpread(primary, secondary)
    expect(spread).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    expect(calculateSpread([], [])).toEqual([])
  })
})

describe('calculateRatio', () => {
  it('calculates price ratio correctly', () => {
    const primary = [100, 200, 300]
    const secondary = [50, 50, 50]
    const ratio = calculateRatio(primary, secondary)
    expect(ratio).toEqual([2, 4, 6])
  })

  it('returns 0 for zero secondary price', () => {
    const primary = [100]
    const secondary = [0]
    expect(calculateRatio(primary, secondary)).toEqual([0])
  })

  it('handles different length arrays', () => {
    const primary = [100, 200, 300]
    const secondary = [50, 100]
    const ratio = calculateRatio(primary, secondary)
    expect(ratio).toHaveLength(2)
  })
})

describe('calculateZScore', () => {
  it('calculates z-score correctly', () => {
    const spread = [0, 1, 2, 3, 4, 10]
    const result = calculateZScore(spread)
    expect(result.current).toBe(10)
    expect(result.mean).toBe(20 / 6) // 3.333...
    expect(result.zscore).toBeGreaterThan(1)
  })

  it('returns zeros for empty array', () => {
    const result = calculateZScore([])
    expect(result).toEqual({ zscore: 0, mean: 0, std: 0, current: 0 })
  })

  it('returns 0 zscore when std is 0', () => {
    const spread = [5, 5, 5, 5]
    const result = calculateZScore(spread)
    expect(result.zscore).toBe(0)
    expect(result.std).toBe(0)
  })

  it('handles negative z-scores', () => {
    const spread = [10, 9, 8, 7, 6, 0]
    const result = calculateZScore(spread)
    expect(result.zscore).toBeLessThan(-2)
  })
})
