/**
 * Core statistical functions - ported from .NET StatisticsHelper
 */

const EPSILON = 1e-12

/**
 * Calculate the arithmetic mean of an array of numbers
 */
export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0
  }
  const sum = values.reduce((acc, val) => acc + val, 0)
  return sum / values.length
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[], avg?: number): number {
  if (values.length < 2) {
    return 0
  }
  const m = avg ?? mean(values)
  const squaredDiffs = values.map(v => (v - m) ** 2)
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Calculate Pearson correlation coefficient between two arrays
 * Returns value between -1 and 1
 */
export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (n < 2) {
    return 0
  }

  const meanA = mean(a.slice(0, n))
  const meanB = mean(b.slice(0, n))

  let numerator = 0
  let denomA = 0
  let denomB = 0

  for (let i = 0; i < n; i++) {
    const diffA = a[i] - meanA
    const diffB = b[i] - meanB
    numerator += diffA * diffB
    denomA += diffA * diffA
    denomB += diffB * diffB
  }

  const denominator = Math.sqrt(denomA * denomB)
  if (denominator < EPSILON) {
    return 0
  }

  return clamp(numerator / denominator, -1, 1)
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Check if a number is finite and not NaN
 */
export function isFinite(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value)
}

/**
 * Calculate sum of squares
 */
export function sumOfSquares(values: number[]): number {
  return values.reduce((acc, val) => acc + val * val, 0)
}

/**
 * Calculate log returns from close prices
 * Returns an array of length (closes.length - 1)
 */
export function calculateReturns(closes: number[]): number[] {
  if (closes.length < 2) {
    return []
  }

  const returns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const prev = Math.max(EPSILON, closes[i - 1])
    const current = Math.max(EPSILON, closes[i])
    returns.push(Math.log(current / prev))
  }
  return returns
}

/**
 * Calculate log spread between two price series
 * spread = log(primary) - log(secondary)
 */
export function calculateSpread(primary: number[], secondary: number[]): number[] {
  const length = Math.min(primary.length, secondary.length)
  const spread: number[] = []

  for (let i = 0; i < length; i++) {
    const p = Math.max(EPSILON, primary[i])
    const s = Math.max(EPSILON, secondary[i])
    spread.push(Math.log(p) - Math.log(s))
  }
  return spread
}

/**
 * Calculate price ratio between two series
 */
export function calculateRatio(primary: number[], secondary: number[]): number[] {
  const length = Math.min(primary.length, secondary.length)
  const ratio: number[] = []

  for (let i = 0; i < length; i++) {
    const s = secondary[i]
    ratio.push(s > 0 ? primary[i] / s : 0)
  }
  return ratio
}

interface AlignSeriesOptions {
  requirePositive?: boolean
}

/**
 * Align two series by dropping entries where either value is invalid.
 * By default, non-positive values are also removed because downstream
 * calculations use logarithms.
 * Returns aligned arrays and count of dropped entries
 */
export function alignSeries(
  primary: number[],
  secondary: number[],
  options: AlignSeriesOptions = {}
): { primary: number[]; secondary: number[]; droppedCount: number } {
  const { requirePositive = true } = options
  const length = Math.min(primary.length, secondary.length)
  const alignedPrimary: number[] = []
  const alignedSecondary: number[] = []
  let droppedCount = 0

  for (let i = 0; i < length; i++) {
    const p = primary[i]
    const s = secondary[i]
    const invalidValue =
      !Number.isFinite(p) || !Number.isFinite(s) || (requirePositive && (p <= 0 || s <= 0))
    if (invalidValue) {
      droppedCount++
      continue
    }
    alignedPrimary.push(p)
    alignedSecondary.push(s)
  }

  return { primary: alignedPrimary, secondary: alignedSecondary, droppedCount }
}

/**
 * Calculate Z-score of the current spread value
 */
export function calculateZScore(spread: number[]): {
  zscore: number
  mean: number
  std: number
  current: number
} {
  if (spread.length === 0) {
    return { zscore: 0, mean: 0, std: 0, current: 0 }
  }

  const spreadMean = mean(spread)
  const spreadStd = standardDeviation(spread, spreadMean)
  const current = spread[spread.length - 1]

  const zscore = spreadStd > EPSILON ? (current - spreadMean) / spreadStd : 0

  return {
    zscore,
    mean: spreadMean,
    std: spreadStd,
    current,
  }
}
