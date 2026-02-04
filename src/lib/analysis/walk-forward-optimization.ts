/* eslint-disable max-lines */

import { runBacktest } from './backtest-engine'
import type {
  BacktestConfig,
  BacktestSummary,
  OptimizedParams,
  PriceData,
  WalkForwardWindowResult,
} from '@/types/backtest-types'
import { DEFAULT_BACKTEST_CONFIG } from '@/types/backtest-types'

const MIN_WINDOW_BARS = 120

const DEFAULT_PARAMETER_GRID: Record<keyof BacktestConfig, number[]> = {
  entrySpreadThreshold: [1.5, 2, 2.5, 3, 3.5],
  minCorrelation: [0.55, 0.65, 0.75, 0.85],
  takeProfitPercent: [0.3, 0.5, 0.8, 1.2],
  stopLossPercent: [0.3, 0.5, 0.8, 1.2],
}

type ConfigAggregate = {
  config: BacktestConfig
  weightedScore: number
  totalWeight: number
  totalProfit: number
  selectionCount: number
}

function toConfigKey(config: BacktestConfig): string {
  return [
    config.entrySpreadThreshold.toFixed(2),
    config.minCorrelation.toFixed(2),
    config.takeProfitPercent.toFixed(2),
    config.stopLossPercent.toFixed(2),
  ].join('|')
}

function normalizeWindowSize(value: number, fallback: number): number {
  const normalized = Math.floor(value)
  return normalized >= MIN_WINDOW_BARS ? normalized : fallback
}

function buildConfigGrid(): BacktestConfig[] {
  const configs: BacktestConfig[] = []

  for (const entrySpreadThreshold of DEFAULT_PARAMETER_GRID.entrySpreadThreshold) {
    for (const minCorrelation of DEFAULT_PARAMETER_GRID.minCorrelation) {
      for (const takeProfitPercent of DEFAULT_PARAMETER_GRID.takeProfitPercent) {
        for (const stopLossPercent of DEFAULT_PARAMETER_GRID.stopLossPercent) {
          configs.push({
            entrySpreadThreshold,
            minCorrelation,
            takeProfitPercent,
            stopLossPercent,
          })
        }
      }
    }
  }

  return configs
}

function scoreSummary(summary: BacktestSummary): number {
  if (summary.totalTrades === 0) {
    return -300
  }

  const cappedProfitFactor =
    summary.profitFactor === Infinity ? 4 : Math.min(summary.profitFactor, 4)
  const lowTradePenalty = summary.totalTrades < 3 ? (3 - summary.totalTrades) * 5 : 0

  return (
    summary.totalProfitPercent * 2.2 +
    summary.winRate * 0.35 +
    cappedProfitFactor * 6 -
    summary.maxDrawdownPercent * 1.8 -
    lowTradePenalty
  )
}

function createFallback(trainWindow: number, testWindow: number): OptimizedParams {
  return {
    config: DEFAULT_BACKTEST_CONFIG,
    confidence: 'low',
    windowsEvaluated: 0,
    trainWindow,
    testWindow,
    forwardScore: 0,
    walkForwardProfitPercent: 0,
    walkForwardWinRate: 0,
    walkForwardTrades: 0,
    baselineProfitPercent: 0,
    improvementPercent: 0,
    windowResults: [],
  }
}

function toPriceSeries(window: PriceData[]): { primary: number[]; secondary: number[] } {
  return {
    primary: window.map(p => p.primaryClose),
    secondary: window.map(p => p.secondaryClose),
  }
}

function selectConfidence(
  windowsEvaluated: number,
  selectedCount: number,
  improvementPercent: number
): OptimizedParams['confidence'] {
  const selectionRatio = windowsEvaluated > 0 ? selectedCount / windowsEvaluated : 0

  if (windowsEvaluated >= 6 && selectionRatio >= 0.5 && improvementPercent > 0) {
    return 'high'
  }
  if (windowsEvaluated >= 3 && improvementPercent > -1) {
    return 'medium'
  }
  return 'low'
}

function aggregateWindowResult(
  aggregates: Map<string, ConfigAggregate>,
  config: BacktestConfig,
  score: number,
  summary: BacktestSummary,
  windowIndex: number
): void {
  const key = toConfigKey(config)
  const weight = 1 + windowIndex * 0.1
  const current = aggregates.get(key)

  if (!current) {
    aggregates.set(key, {
      config,
      weightedScore: score * weight,
      totalWeight: weight,
      totalProfit: summary.totalProfitPercent,
      selectionCount: 1,
    })
    return
  }

  current.weightedScore += score * weight
  current.totalWeight += weight
  current.totalProfit += summary.totalProfitPercent
  current.selectionCount += 1
}

function pickBestAggregate(aggregates: Map<string, ConfigAggregate>): ConfigAggregate | null {
  let best: ConfigAggregate | null = null
  let bestScore = -Infinity

  for (const aggregate of aggregates.values()) {
    const averageScore = aggregate.weightedScore / aggregate.totalWeight
    if (averageScore > bestScore) {
      bestScore = averageScore
      best = aggregate
      continue
    }

    if (averageScore === bestScore && best && aggregate.totalProfit > best.totalProfit) {
      best = aggregate
    }
  }

  return best
}

function evaluateWindow(
  historicalData: PriceData[],
  start: number,
  trainWindow: number,
  testWindow: number,
  configGrid: BacktestConfig[]
): {
  selectedConfig: BacktestConfig
  trainScore: number
  testScore: number
  testSummary: BacktestSummary
  baselineProfitPercent: number
} {
  const trainSlice = historicalData.slice(start, start + trainWindow)
  const testSlice = historicalData.slice(start + trainWindow, start + trainWindow + testWindow)
  const trainSeries = toPriceSeries(trainSlice)
  const testSeries = toPriceSeries(testSlice)

  let bestTrainConfig: BacktestConfig = DEFAULT_BACKTEST_CONFIG
  let bestTrainScore = -Infinity

  for (const candidate of configGrid) {
    const trainResult = runBacktest(
      trainSeries.primary,
      trainSeries.secondary,
      'TRAIN',
      'PRIMARY',
      candidate
    )
    const candidateScore = scoreSummary(trainResult.summary)
    if (candidateScore > bestTrainScore) {
      bestTrainScore = candidateScore
      bestTrainConfig = candidate
    }
  }

  const testResult = runBacktest(
    testSeries.primary,
    testSeries.secondary,
    'TEST',
    'PRIMARY',
    bestTrainConfig
  )
  const baselineResult = runBacktest(
    testSeries.primary,
    testSeries.secondary,
    'TEST',
    'PRIMARY',
    DEFAULT_BACKTEST_CONFIG
  )

  return {
    selectedConfig: bestTrainConfig,
    trainScore: bestTrainScore,
    testScore: scoreSummary(testResult.summary),
    testSummary: testResult.summary,
    baselineProfitPercent: baselineResult.summary.totalProfitPercent,
  }
}

export function buildPriceData(primaryCloses: number[], secondaryCloses: number[]): PriceData[] {
  const minLength = Math.min(primaryCloses.length, secondaryCloses.length)
  if (minLength === 0) {
    return []
  }

  const alignedPrimary = primaryCloses.slice(-minLength)
  const alignedSecondary = secondaryCloses.slice(-minLength)

  return alignedPrimary.map((primaryClose, index) => ({
    primaryClose,
    secondaryClose: alignedSecondary[index],
  }))
}

// Walk-forward optimization on rolling windows.
export function optimizeParameters(
  historicalData: PriceData[],
  trainWindow: number = 500,
  testWindow: number = 100
): OptimizedParams {
  const normalizedTrainWindow = normalizeWindowSize(trainWindow, 500)
  const normalizedTestWindow = normalizeWindowSize(testWindow, 120)
  const minRequired = normalizedTrainWindow + normalizedTestWindow

  if (historicalData.length < minRequired) {
    return createFallback(normalizedTrainWindow, normalizedTestWindow)
  }

  const configGrid = buildConfigGrid()
  const windowResults: WalkForwardWindowResult[] = []
  const aggregates = new Map<string, ConfigAggregate>()

  let totalWalkForwardTrades = 0
  let totalWalkForwardWins = 0
  let totalWalkForwardProfit = 0
  let baselineProfit = 0

  for (
    let start = 0, windowIndex = 0;
    start + minRequired <= historicalData.length;
    start += normalizedTestWindow, windowIndex++
  ) {
    const windowEvaluation = evaluateWindow(
      historicalData,
      start,
      normalizedTrainWindow,
      normalizedTestWindow,
      configGrid
    )

    windowResults.push({
      windowIndex,
      trainStart: start,
      trainEnd: start + normalizedTrainWindow - 1,
      testStart: start + normalizedTrainWindow,
      testEnd: start + normalizedTrainWindow + normalizedTestWindow - 1,
      selectedConfig: windowEvaluation.selectedConfig,
      trainScore: windowEvaluation.trainScore,
      testScore: windowEvaluation.testScore,
      testSummary: windowEvaluation.testSummary,
    })

    aggregateWindowResult(
      aggregates,
      windowEvaluation.selectedConfig,
      windowEvaluation.testScore,
      windowEvaluation.testSummary,
      windowIndex
    )
    baselineProfit += windowEvaluation.baselineProfitPercent
    totalWalkForwardTrades += windowEvaluation.testSummary.totalTrades
    totalWalkForwardWins += windowEvaluation.testSummary.winningTrades
    totalWalkForwardProfit += windowEvaluation.testSummary.totalProfitPercent
  }

  const bestAggregate = pickBestAggregate(aggregates)
  if (!bestAggregate || windowResults.length === 0) {
    return createFallback(normalizedTrainWindow, normalizedTestWindow)
  }

  const walkForwardWinRate =
    totalWalkForwardTrades > 0 ? (totalWalkForwardWins / totalWalkForwardTrades) * 100 : 0
  const improvementPercent = totalWalkForwardProfit - baselineProfit

  return {
    config: bestAggregate.config,
    confidence: selectConfidence(
      windowResults.length,
      bestAggregate.selectionCount,
      improvementPercent
    ),
    windowsEvaluated: windowResults.length,
    trainWindow: normalizedTrainWindow,
    testWindow: normalizedTestWindow,
    forwardScore: bestAggregate.weightedScore / bestAggregate.totalWeight,
    walkForwardProfitPercent: totalWalkForwardProfit,
    walkForwardWinRate,
    walkForwardTrades: totalWalkForwardTrades,
    baselineProfitPercent: baselineProfit,
    improvementPercent,
    windowResults,
  }
}
