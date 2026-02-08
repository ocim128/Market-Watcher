/**
 * Multi-timeframe confluence analysis
 * Analyzes pair signals across multiple timeframes for higher confidence
 */

import { analyzePair } from './pair-analysis'
import { createReversionScorer, type ReversionScorer } from './reversion-scoring'
import type { ScanMode } from '@/config'

import type {
  ConfluenceResult,
  TimeframeAnalysis,
  ConfluenceOptions,
} from './multi-timeframe-types'
import { DEFAULT_OPTIONS } from './multi-timeframe-types'
import {
  getIntervalWeight,
  calculateAgreement,
  determineSignalDirection,
  signalsAlign,
  calculateConfluenceScore,
  determineConfidence,
  buildConfluenceNotes,
  createEmptyConfluenceResult,
  getConfluenceIntervalOptions,
  getSuggestedTimeframes,
} from './multi-timeframe-utils'

interface RuntimeConfluenceOptions {
  scanMode?: ScanMode
  reversionScorersByInterval?: Map<string, ReversionScorer>
}

export type { ConfluenceResult, TimeframeAnalysis, ConfluenceOptions }
export { getConfluenceIntervalOptions, getSuggestedTimeframes }

function analyzeTimeframes(
  timeframeData: Map<string, { primary: number[]; secondary: number[] }>,
  symbol: string,
  primarySymbol: string,
  intervals: string[],
  scanMode: ScanMode,
  reversionScorersByInterval?: Map<string, ReversionScorer>
): TimeframeAnalysis[] {
  const analyses: TimeframeAnalysis[] = []

  for (const interval of intervals) {
    const data = timeframeData.get(interval)
    if (!data || data.primary.length === 0 || data.secondary.length === 0) {
      continue
    }

    const rawResult = analyzePair(data.primary, data.secondary, symbol, primarySymbol, {
      computeCorrelationVelocity: true,
      computeVolatilityAdjustedSpread: true,
    })
    const scorer =
      reversionScorersByInterval?.get(interval) ??
      createReversionScorer({
        interval,
        scanMode,
        primaryPair: primarySymbol,
      })
    const result = scorer.score(rawResult)

    analyses.push({ interval, result, weight: getIntervalWeight(interval) })
  }

  return analyses
}

function calculateAgreementMetrics(analyses: TimeframeAnalysis[]) {
  const zScores = analyses.map(a => a.result.spreadZScore)
  const correlations = analyses.map(a => a.result.correlation)
  const qualities = analyses.map(a => a.result.volatilitySpread.signalQuality)
  const directions = analyses.map(a => determineSignalDirection([a.result.spreadZScore]))

  const qualityCounts = qualities.reduce(
    (acc, q) => {
      acc[q] = (acc[q] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  const qualityAgreement = Math.max(...Object.values(qualityCounts)) / qualities.length

  return {
    zScoreAgreement: calculateAgreement(zScores.map(z => Math.abs(z))),
    correlationAgreement: calculateAgreement(correlations.map(c => Math.abs(c))),
    qualityAgreement,
    alignmentResult: signalsAlign(directions),
    directions,
  }
}

export function analyzeMultiTimeframeConfluence(
  timeframeData: Map<string, { primary: number[]; secondary: number[] }>,
  symbol: string,
  primarySymbol: string,
  options: ConfluenceOptions & RuntimeConfluenceOptions = {}
): ConfluenceResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const scanMode = options.scanMode ?? 'primary_vs_all'
  const analyses = analyzeTimeframes(
    timeframeData,
    symbol,
    primarySymbol,
    opts.intervals,
    scanMode,
    options.reversionScorersByInterval
  )

  if (analyses.length === 0) {
    return createEmptyConfluenceResult(symbol, primarySymbol, opts.intervals.length)
  }

  const { zScoreAgreement, correlationAgreement, qualityAgreement, alignmentResult } =
    calculateAgreementMetrics(analyses)

  const totalWeight = analyses.reduce((sum, a) => sum + a.weight, 0)
  const weightedOpportunity =
    analyses.reduce((sum, a) => sum + a.result.opportunityScore * a.weight, 0) / totalWeight

  const sortedByScore = [...analyses].sort(
    (a, b) => b.result.opportunityScore - a.result.opportunityScore
  )
  const uniqueOpportunityScores = new Set(analyses.map(a => a.result.opportunityScore))
  const allScoresIdentical = uniqueOpportunityScores.size === 1 && analyses.length > 2

  if (allScoresIdentical) {
    console.warn(
      `[MTF] Suspicious: All ${analyses.length} intervals have identical opportunity score: ${analyses[0].result.opportunityScore}`
    )
  }

  const confluenceScore = calculateConfluenceScore(
    weightedOpportunity,
    alignmentResult.strength,
    zScoreAgreement,
    correlationAgreement,
    qualityAgreement,
    analyses,
    allScoresIdentical
  )
  const confidence = determineConfidence(
    alignmentResult.strength,
    zScoreAgreement,
    qualityAgreement,
    alignmentResult.count,
    alignmentResult.aligned
  )
  const signalDirection = determineSignalDirection(analyses.map(a => a.result.spreadZScore))

  return {
    symbol,
    primarySymbol,
    confluenceScore,
    confidence,
    timeframeAnalyses: analyses,
    alignedTimeframes: alignmentResult.count,
    totalTimeframes: analyses.length,
    averageOpportunity: Math.round(weightedOpportunity),
    bestTimeframe: sortedByScore[0]?.interval || null,
    worstTimeframe: sortedByScore[sortedByScore.length - 1]?.interval || null,
    signalDirection,
    zScoreAgreement: Math.round(zScoreAgreement * 100) / 100,
    correlationAgreement: Math.round(correlationAgreement * 100) / 100,
    qualityAgreement: Math.round(qualityAgreement * 100) / 100,
    notes: buildConfluenceNotes(
      analyses,
      confidence,
      alignmentResult.count,
      signalDirection,
      zScoreAgreement,
      qualityAgreement,
      allScoresIdentical,
      primarySymbol,
      symbol
    ),
  }
}
