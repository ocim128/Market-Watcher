import { clamp, mean } from './statistics'

const EPSILON = 1e-12
const DEFAULT_ADF_CRITICAL = -2.86

export interface AdfTestResult {
  tStat: number
  criticalValue: number
  passed: boolean
  sampleSize: number
}

export interface CointegrationTestResult extends AdfTestResult {
  beta: number
  intercept: number
}

export interface MeanReversionAnalysis {
  spread: number[]
  betaSeries: number[]
  currentBeta: number
  adf: AdfTestResult
  cointegration: CointegrationTestResult
  halfLifeBars: number
  halfLifePassed: boolean
  isMeanReverting: boolean
}

export interface MeanReversionOptions {
  rollingBetaWindow?: number
  rollingBetaMinWindow?: number
  adfCriticalValue?: number
  minHalfLifeBars?: number
  maxHalfLifeBars?: number
}

const DEFAULT_OPTIONS: Required<MeanReversionOptions> = {
  rollingBetaWindow: 120,
  rollingBetaMinWindow: 40,
  adfCriticalValue: DEFAULT_ADF_CRITICAL,
  minHalfLifeBars: 2,
  maxHalfLifeBars: 120,
}

interface LinearRegressionResult {
  slope: number
  intercept: number
  slopeStdErr: number
}

function safeLog(value: number): number {
  return Math.log(Math.max(EPSILON, value))
}

function linearRegression(y: number[], x: number[]): LinearRegressionResult {
  const n = Math.min(y.length, x.length)
  if (n < 3) {
    return { slope: 0, intercept: 0, slopeStdErr: Infinity }
  }

  const ySlice = y.slice(0, n)
  const xSlice = x.slice(0, n)
  const xMean = mean(xSlice)
  const yMean = mean(ySlice)

  let covariance = 0
  let varianceX = 0
  for (let i = 0; i < n; i++) {
    const xDelta = xSlice[i] - xMean
    const yDelta = ySlice[i] - yMean
    covariance += xDelta * yDelta
    varianceX += xDelta * xDelta
  }

  if (varianceX < EPSILON) {
    return { slope: 0, intercept: yMean, slopeStdErr: Infinity }
  }

  const slope = covariance / varianceX
  const intercept = yMean - slope * xMean

  let sse = 0
  for (let i = 0; i < n; i++) {
    const fitted = intercept + slope * xSlice[i]
    const residual = ySlice[i] - fitted
    sse += residual * residual
  }

  const dof = n - 2
  const varianceResidual = dof > 0 ? sse / dof : 0
  const slopeStdErr =
    varianceX > EPSILON ? Math.sqrt(Math.max(varianceResidual, 0) / varianceX) : Infinity

  return { slope, intercept, slopeStdErr }
}

export function calculateRollingBetaSpread(
  primary: number[],
  secondary: number[],
  options: MeanReversionOptions = {}
): { spread: number[]; betaSeries: number[]; currentBeta: number } {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const length = Math.min(primary.length, secondary.length)

  if (length < 3) {
    return { spread: [], betaSeries: [], currentBeta: 1 }
  }

  const logPrimary = primary.slice(0, length).map(safeLog)
  const logSecondary = secondary.slice(0, length).map(safeLog)
  const betaSeries: number[] = []
  const spread: number[] = []

  for (let i = 0; i < length; i++) {
    const windowEnd = i + 1
    const windowSize = Math.min(opts.rollingBetaWindow, windowEnd)
    const windowStart = Math.max(0, windowEnd - windowSize)
    const minWindowStart = Math.max(0, windowEnd - opts.rollingBetaMinWindow)
    const start = windowEnd - windowStart < opts.rollingBetaMinWindow ? minWindowStart : windowStart

    const yWindow = logPrimary.slice(start, windowEnd)
    const xWindow = logSecondary.slice(start, windowEnd)
    const regression = linearRegression(yWindow, xWindow)
    let beta = clamp(regression.slope, -5, 5)
    if (Math.abs(beta) < 0.05) {
      beta = beta < 0 ? -0.05 : 0.05
    }

    betaSeries.push(beta)
    spread.push(logPrimary[i] - beta * logSecondary[i])
  }

  return {
    spread,
    betaSeries,
    currentBeta: betaSeries[betaSeries.length - 1] ?? 1,
  }
}

export function runAdfTest(
  series: number[],
  criticalValue: number = DEFAULT_ADF_CRITICAL
): AdfTestResult {
  if (series.length < 20) {
    return { tStat: 0, criticalValue, passed: false, sampleSize: series.length }
  }

  const dy: number[] = []
  const lagged: number[] = []
  for (let i = 1; i < series.length; i++) {
    dy.push(series[i] - series[i - 1])
    lagged.push(series[i - 1])
  }

  const regression = linearRegression(dy, lagged)
  const tStat =
    regression.slopeStdErr > EPSILON
      ? regression.slope / regression.slopeStdErr
      : Number.POSITIVE_INFINITY
  const passed = Number.isFinite(tStat) && tStat < criticalValue

  return {
    tStat,
    criticalValue,
    passed,
    sampleSize: lagged.length,
  }
}

export function estimateHalfLife(series: number[]): number {
  if (series.length < 20) {
    return Number.POSITIVE_INFINITY
  }

  const delta: number[] = []
  const lagged: number[] = []
  for (let i = 1; i < series.length; i++) {
    delta.push(series[i] - series[i - 1])
    lagged.push(series[i - 1])
  }

  const regression = linearRegression(delta, lagged)
  const lambda = regression.slope
  if (!Number.isFinite(lambda) || lambda >= 0 || Math.abs(lambda) < EPSILON) {
    return Number.POSITIVE_INFINITY
  }

  return -Math.log(2) / lambda
}

function runCointegrationTest(
  primary: number[],
  secondary: number[],
  criticalValue: number
): CointegrationTestResult {
  const length = Math.min(primary.length, secondary.length)
  if (length < 20) {
    return {
      tStat: 0,
      criticalValue,
      passed: false,
      sampleSize: length,
      beta: 0,
      intercept: 0,
    }
  }

  const logPrimary = primary.slice(0, length).map(safeLog)
  const logSecondary = secondary.slice(0, length).map(safeLog)
  const regression = linearRegression(logPrimary, logSecondary)

  const residuals = logPrimary.map(
    (p, i) => p - (regression.intercept + regression.slope * logSecondary[i])
  )
  const adf = runAdfTest(residuals, criticalValue)

  return {
    ...adf,
    beta: regression.slope,
    intercept: regression.intercept,
  }
}

export function analyzeMeanReversion(
  primary: number[],
  secondary: number[],
  options: MeanReversionOptions = {}
): MeanReversionAnalysis {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const { spread, betaSeries, currentBeta } = calculateRollingBetaSpread(primary, secondary, opts)

  if (spread.length < 20) {
    const adf = runAdfTest(spread, opts.adfCriticalValue)
    const cointegration = runCointegrationTest(primary, secondary, opts.adfCriticalValue)
    return {
      spread,
      betaSeries,
      currentBeta,
      adf,
      cointegration,
      halfLifeBars: Number.POSITIVE_INFINITY,
      halfLifePassed: false,
      isMeanReverting: false,
    }
  }

  const adf = runAdfTest(spread, opts.adfCriticalValue)
  const cointegration = runCointegrationTest(primary, secondary, opts.adfCriticalValue)
  const halfLifeBars = estimateHalfLife(spread)
  const halfLifePassed =
    Number.isFinite(halfLifeBars) &&
    halfLifeBars >= opts.minHalfLifeBars &&
    halfLifeBars <= opts.maxHalfLifeBars

  const isMeanReverting = adf.passed && cointegration.passed && halfLifePassed

  return {
    spread,
    betaSeries,
    currentBeta,
    adf,
    cointegration,
    halfLifeBars,
    halfLifePassed,
    isMeanReverting,
  }
}
