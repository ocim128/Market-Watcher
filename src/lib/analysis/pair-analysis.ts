/**
 * Main pair trading analysis function
 * Ported from .NET Methods.AnalyzePairTrading
 */

import {
  mean,
  standardDeviation,
  pearsonCorrelation,
  calculateReturns,
  calculateRatio,
  clamp,
  alignSeries,
} from './statistics'
import { calculateCorrelationVelocity } from './correlation-velocity'
import { calculateVolatilityAdjustedSpread } from './volatility-spread'
import { analyzeMeanReversion } from './mean-reversion'
import { buildNotes } from './notes-builder'
import { calculateConfluence } from './confluence-filter'
import type { PairAnalysisResult } from '@/types'

export interface AnalyzeOptions {
  computeCorrelationVelocity?: boolean
  computeVolatilityAdjustedSpread?: boolean
  computeStationarityGate?: boolean
  correlationVelocityWindow?: number
  correlationVelocityLookback?: number
  volatilityLookbackPeriod?: number
  rollingBetaWindow?: number
  rollingBetaMinWindow?: number
  adfCriticalValue?: number
  minHalfLifeBars?: number
  maxHalfLifeBars?: number
  probabilityLookaheadBars?: number
}

const DEFAULT_OPTIONS: Required<AnalyzeOptions> = {
  computeCorrelationVelocity: true,
  computeVolatilityAdjustedSpread: true,
  computeStationarityGate: true,
  correlationVelocityWindow: 50,
  correlationVelocityLookback: 10,
  volatilityLookbackPeriod: 20,
  rollingBetaWindow: 120,
  rollingBetaMinWindow: 40,
  adfCriticalValue: -2.86,
  minHalfLifeBars: 2,
  maxHalfLifeBars: 120,
  probabilityLookaheadBars: 12,
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

function createDefaultStationarity(): PairAnalysisResult['stationarity'] {
  return {
    adfTStat: 0,
    adfCriticalValue: -2.86,
    adfPassed: false,
    cointegrationTStat: 0,
    cointegrationCriticalValue: -2.86,
    cointegrationPassed: false,
    halfLifeBars: Number.POSITIVE_INFINITY,
    halfLifePassed: false,
    isTradable: false,
  }
}

function createFallbackReversionProbability(
  spreadZScore: number,
  correlation: number,
  stationarityTradable: boolean,
  lookaheadBars: number,
  volatilitySpread?: { adjustedZScore: number; combinedVolatility: number }
): PairAnalysisResult['reversionProbability'] {
  const absZ = Math.abs(volatilitySpread?.adjustedZScore ?? spreadZScore)
  const corrStrength = clamp(Math.abs(correlation), 0, 1)
  const zStrength = clamp(absZ / 3.5, 0, 1)
  const volPenalty = clamp((volatilitySpread?.combinedVolatility ?? 0) * 8, 0, 0.6)
  const tradableMultiplier = stationarityTradable ? 1 : 0.15
  const probability = clamp(
    (0.1 + zStrength * 0.45 + corrStrength * 0.35 - volPenalty) * tradableMultiplier,
    0.01,
    0.98
  )

  return {
    probability,
    lookaheadBars,
    sampleSize: 0,
    wins: 0,
    method: 'fallback',
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

  const meanReversion = analyzeMeanReversion(alignedPrimary, alignedSecondary, {
    rollingBetaWindow: opts.rollingBetaWindow,
    rollingBetaMinWindow: opts.rollingBetaMinWindow,
    adfCriticalValue: opts.adfCriticalValue,
    minHalfLifeBars: opts.minHalfLifeBars,
    maxHalfLifeBars: opts.maxHalfLifeBars,
  })
  const spread = meanReversion.spread
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
        opts.volatilityLookbackPeriod,
        spread
      )
    : undefined

  const {
    score: baseOpportunityScore,
    spreadOpportunity,
    methodAverage,
  } = calculateOpportunityScore(spreadZScore, correlation, volatilitySpread)
  const stationarity: PairAnalysisResult['stationarity'] = {
    adfTStat: meanReversion.adf.tStat,
    adfCriticalValue: meanReversion.adf.criticalValue,
    adfPassed: meanReversion.adf.passed,
    cointegrationTStat: meanReversion.cointegration.tStat,
    cointegrationCriticalValue: meanReversion.cointegration.criticalValue,
    cointegrationPassed: meanReversion.cointegration.passed,
    halfLifeBars: meanReversion.halfLifeBars,
    halfLifePassed: meanReversion.halfLifePassed,
    isTradable: opts.computeStationarityGate ? meanReversion.isMeanReverting : true,
  }
  const reversionProbability = createFallbackReversionProbability(
    spreadZScore,
    correlation,
    stationarity.isTradable,
    opts.probabilityLookaheadBars,
    volatilitySpread
  )
  const probabilityScore = Math.round(reversionProbability.probability * 100)
  const opportunityScore = stationarity.isTradable
    ? Math.round(baseOpportunityScore * 0.15 + probabilityScore * 0.85)
    : 0

  const notes = buildNotes(spreadZScore, correlation, correlationVelocity, volatilitySpread)
  if (!stationarity.isTradable) {
    notes.push(
      'Stationarity gate failed: spread is not reliably mean-reverting (ADF/cointegration/half-life).'
    )
  }

  const baseResult: PairAnalysisResult = {
    pairKey: `${primarySymbol}|${secondarySymbol}`,
    symbol: secondarySymbol,
    primarySymbol,
    timestamp: Date.now(),
    correlation,
    spreadMean,
    spreadStd,
    spreadZScore,
    hedgeRatioBeta: meanReversion.currentBeta,
    stationarity,
    ratio,
    alignedBars: alignedPrimary.length,
    opportunityScore,
    reversionProbability,
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
    pairKey: `${primarySymbol}|${symbol}`,
    symbol,
    primarySymbol,
    timestamp: Date.now(),
    correlation: 0,
    spreadMean: 0,
    spreadStd: 0,
    spreadZScore: 0,
    hedgeRatioBeta: 1,
    stationarity: createDefaultStationarity(),
    ratio: 0,
    alignedBars: 0,
    opportunityScore: 0,
    reversionProbability: {
      probability: 0,
      lookaheadBars: 12,
      sampleSize: 0,
      wins: 0,
      method: 'fallback',
    },
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
