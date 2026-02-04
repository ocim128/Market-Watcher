/**
 * Main pair trading analysis function
 * Ported from .NET Methods.AnalyzePairTrading
 */

import {
  mean,
  standardDeviation,
  pearsonCorrelation,
  calculateReturns,
  calculateSpread,
  calculateRatio,
  clamp,
  alignSeries,
} from './statistics'
import { calculateCorrelationVelocity } from './correlation-velocity'
import { calculateVolatilityAdjustedSpread } from './volatility-spread'
import { buildNotes } from './notes-builder'
import { calculateConfluence } from './confluence-filter'
import type { PairAnalysisResult } from '@/types'

export interface AnalyzeOptions {
  computeCorrelationVelocity?: boolean
  computeVolatilityAdjustedSpread?: boolean
  correlationVelocityWindow?: number
  correlationVelocityLookback?: number
  volatilityLookbackPeriod?: number
}

const DEFAULT_OPTIONS: Required<AnalyzeOptions> = {
  computeCorrelationVelocity: true,
  computeVolatilityAdjustedSpread: true,
  correlationVelocityWindow: 50,
  correlationVelocityLookback: 10,
  volatilityLookbackPeriod: 20,
}

function calculateOpportunityScore(
  spreadZScore: number,
  correlation: number,
  volatilitySpread?: { adjustedZScore: number; signalStrength: number }
): { score: number; spreadOpportunity: number; methodAverage: number } {
  const effectiveSpreadZ = volatilitySpread ? volatilitySpread.adjustedZScore : spreadZScore
  const absZ = Math.abs(effectiveSpreadZ)

  const spreadOpportunity = clamp((1 - 1 / (1 + absZ * 0.5)) * 100, 0, 85)
  const correlationQuality = clamp(Math.abs(correlation), 0, 1)
  const methodAverage = volatilitySpread ? clamp(volatilitySpread.signalStrength * 0.7, 0, 70) : 0

  const rawScore = spreadOpportunity * 0.45 + methodAverage * 0.3 + correlationQuality * 25
  const score = clamp(Math.round(rawScore), 0, 100)

  return { score, spreadOpportunity, methodAverage }
}

function createDefaultVolatilitySpread(spreadZScore: number) {
  return {
    rawZScore: spreadZScore,
    adjustedZScore: spreadZScore,
    combinedVolatility: 0,
    primaryVolatility: 0,
    secondaryVolatility: 0,
    signalStrength: 0,
    signalQuality: 'insufficient_data' as const,
  }
}

function createDefaultCorrelationVelocity(correlation: number) {
  return {
    currentCorrelation: correlation,
    previousCorrelation: correlation,
    velocity: 0,
    acceleration: 0,
    regime: 'stable' as const,
  }
}

function createDefaultConfluence() {
  return {
    rating: 0,
    ratingLabel: 'No Confluence',
    indicators: {
      zScoreExtreme: false,
      correlationStrengthening: false,
      signalQualityStrong: false,
    },
    indicatorDetails: [],
    meetsThreshold: false,
    direction: 'neutral' as const,
  }
}

export function analyzePair(
  primaryCloses: number[],
  secondaryCloses: number[],
  secondarySymbol: string,
  primarySymbol: string = 'primary',
  options: AnalyzeOptions = {}
): PairAnalysisResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Align series by dropping invalid entries (matches .NET implementation)
  const { primary: alignedPrimary, secondary: alignedSecondary } = alignSeries(
    primaryCloses,
    secondaryCloses
  )

  if (alignedPrimary.length < 2) {
    return createEmptyResult(secondarySymbol, primarySymbol)
  }

  const returnsPrimary = calculateReturns(alignedPrimary)
  const returnsSecondary = calculateReturns(alignedSecondary)
  const correlation = pearsonCorrelation(returnsPrimary, returnsSecondary)

  const spread = calculateSpread(alignedPrimary, alignedSecondary)
  const ratioSeries = calculateRatio(alignedPrimary, alignedSecondary)

  const spreadMean = mean(spread)
  const spreadStd = standardDeviation(spread, spreadMean)
  const spreadZScore = spreadStd > 0 ? (spread[spread.length - 1] - spreadMean) / spreadStd : 0
  const ratio = ratioSeries.length > 0 ? ratioSeries[ratioSeries.length - 1] : 0

  const correlationVelocity = opts.computeCorrelationVelocity
    ? calculateCorrelationVelocity(
        returnsPrimary,
        returnsSecondary,
        opts.correlationVelocityWindow,
        opts.correlationVelocityLookback
      )
    : undefined

  const volatilitySpread = opts.computeVolatilityAdjustedSpread
    ? calculateVolatilityAdjustedSpread(
        alignedPrimary,
        alignedSecondary,
        opts.volatilityLookbackPeriod
      )
    : undefined

  const {
    score: opportunityScore,
    spreadOpportunity,
    methodAverage,
  } = calculateOpportunityScore(spreadZScore, correlation, volatilitySpread)

  const notes = buildNotes(spreadZScore, correlation, correlationVelocity, volatilitySpread)

  const baseResult: PairAnalysisResult = {
    symbol: secondarySymbol,
    primarySymbol,
    timestamp: Date.now(),
    correlation,
    spreadMean,
    spreadStd,
    spreadZScore,
    ratio,
    alignedBars: alignedPrimary.length,
    opportunityScore,
    spreadOpportunity,
    methodAverage,
    volatilitySpread: volatilitySpread ?? createDefaultVolatilitySpread(spreadZScore),
    correlationVelocity: correlationVelocity ?? createDefaultCorrelationVelocity(correlation),
    confluence: createDefaultConfluence(),
    notes,
  }

  baseResult.confluence = calculateConfluence(baseResult)
  return baseResult
}

/**
 * Create an empty result for when there's insufficient data
 */
function createEmptyResult(symbol: string, primarySymbol: string): PairAnalysisResult {
  return {
    symbol,
    primarySymbol,
    timestamp: Date.now(),
    correlation: 0,
    spreadMean: 0,
    spreadStd: 0,
    spreadZScore: 0,
    ratio: 0,
    alignedBars: 0,
    opportunityScore: 0,
    spreadOpportunity: 0,
    methodAverage: 0,
    volatilitySpread: {
      rawZScore: 0,
      adjustedZScore: 0,
      combinedVolatility: 0,
      primaryVolatility: 0,
      secondaryVolatility: 0,
      signalStrength: 0,
      signalQuality: 'insufficient_data',
    },
    correlationVelocity: {
      currentCorrelation: 0,
      previousCorrelation: 0,
      velocity: 0,
      acceleration: 0,
      regime: 'stable',
    },
    confluence: {
      rating: 0,
      ratingLabel: 'No Confluence',
      indicators: {
        zScoreExtreme: false,
        correlationStrengthening: false,
        signalQualityStrong: false,
      },
      indicatorDetails: [],
      meetsThreshold: false,
      direction: 'neutral',
    },
    notes: ['Insufficient data for analysis.'],
  }
}

/**
 * Analyze multiple pairs against a primary pair
 */
export function analyzeAllPairs(
  primaryCloses: number[],
  pairsData: Array<{ symbol: string; closes: number[] }>,
  primarySymbol: string = 'ETHUSDT',
  options: AnalyzeOptions = {}
): PairAnalysisResult[] {
  return pairsData.map(pair =>
    analyzePair(primaryCloses, pair.closes, pair.symbol, primarySymbol, options)
  )
}
