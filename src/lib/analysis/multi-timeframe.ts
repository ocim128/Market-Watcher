/**
 * Multi-timeframe confluence analysis
 * Analyzes pair signals across multiple timeframes for higher confidence
 */

import { analyzePair } from './pair-analysis'
import type { PairAnalysisResult } from '@/types'

export interface TimeframeAnalysis {
  interval: string // Supports native ("5m") and custom ("7m", "10m") intervals
  result: PairAnalysisResult
  weight: number // Weight based on timeframe reliability
}

export interface ConfluenceResult {
  symbol: string
  primarySymbol: string
  confluenceScore: number // 0-100 combined score
  confidence: 'high' | 'medium' | 'low' | 'mixed'
  timeframeAnalyses: TimeframeAnalysis[]
  alignedTimeframes: number
  totalTimeframes: number
  averageOpportunity: number
  bestTimeframe: string | null // e.g., "5m" or "7m"
  worstTimeframe: string | null
  signalDirection: 'long_spread' | 'short_spread' | 'neutral'
  // Agreement metrics
  zScoreAgreement: number // How much Z-scores agree across timeframes (0-1)
  correlationAgreement: number // How much correlations agree (0-1)
  qualityAgreement: number // Agreement on signal quality
  notes: string[]
}

// Weights for different timeframes (higher = more reliable)
// Supports both native and custom intervals
const TIMEFRAME_WEIGHTS: Record<string, number> = {
  '1m': 0.5, // Noisy, lower weight
  '2m': 0.52, // Resampled from 1m
  '3m': 0.6,
  '4m': 0.63, // Resampled from 1m
  '5m': 0.7, // Good for scalping
  '6m': 0.72, // Resampled from 1m
  '7m': 0.73, // Resampled from 1m
  '8m': 0.74, // Resampled from 1m
  '9m': 0.75, // Resampled from 1m
  '10m': 0.76, // Resampled from 1m
  '12m': 0.78, // Resampled from 1m
  '15m': 0.85, // Reliable for intraday
  '20m': 0.87, // Resampled from 5m
  '30m': 0.9, // Native, balanced
  '1h': 1.0, // Most reliable baseline
  '2h': 0.95, // Native, reliable
  '4h': 0.92, // Slower but reliable
  '1d': 0.85, // Very reliable but slow
}

/**
 * Get weight for an interval, with interpolation for unknown intervals
 */
function getIntervalWeight(interval: string): number {
  // Direct lookup first
  if (TIMEFRAME_WEIGHTS[interval] !== undefined) {
    return TIMEFRAME_WEIGHTS[interval]
  }

  // Parse interval to minutes for interpolation
  const unit = interval.slice(-1).toLowerCase()
  const value = parseInt(interval.slice(0, -1)) || 1
  let minutes: number

  switch (unit) {
    case 'm':
      minutes = value
      break
    case 'h':
      minutes = value * 60
      break
    case 'd':
      minutes = value * 1440
      break
    default:
      minutes = value
  }

  // Interpolate based on minutes
  // 1m = 0.5, 60m (1h) = 1.0, scales logarithmically
  const logMin = Math.log(1)
  const logMax = Math.log(60)
  const logCurrent = Math.log(Math.max(1, Math.min(minutes, 60)))

  const weight = 0.5 + 0.5 * ((logCurrent - logMin) / (logMax - logMin))
  return Math.max(0.5, Math.min(1.0, weight))
}

// Default timeframes to analyze for confluence
const DEFAULT_CONFLUENCE_INTERVALS: string[] = ['5m', '15m', '1h']

interface ConfluenceOptions {
  intervals?: string[] // Supports custom intervals like "2m", "7m", "10m"
  minAlignedTimeframes?: number
  zScoreThreshold?: number
  correlationThreshold?: number
}

const DEFAULT_OPTIONS: Required<ConfluenceOptions> = {
  intervals: DEFAULT_CONFLUENCE_INTERVALS,
  minAlignedTimeframes: 2,
  zScoreThreshold: 1.5,
  correlationThreshold: 0.6,
}

/**
 * Calculate agreement between values (0 = no agreement, 1 = perfect agreement)
 */
function calculateAgreement(values: number[]): number {
  if (values.length < 2) {
    return 1
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  // Normalize: lower std dev = higher agreement
  // Scale so that std dev of 0 = 1, std dev of 2 = 0
  const agreement = Math.max(0, 1 - stdDev / 2)
  return agreement
}

/**
 * Determine signal direction based on Z-scores
 */
function determineSignalDirection(zScores: number[]): 'long_spread' | 'short_spread' | 'neutral' {
  const avgZScore = zScores.reduce((a, b) => a + b, 0) / zScores.length

  if (avgZScore > 1) {
    return 'short_spread'
  } // Spread high, expect revert down
  if (avgZScore < -1) {
    return 'long_spread'
  } // Spread low, expect revert up
  return 'neutral'
}

/**
 * Check if signals align (same direction) and return alignment strength
 * Returns: { aligned: boolean, count: number, strength: number }
 * strength is 0-1 where 1 means all signals agree on same direction
 */
function signalsAlign(directions: string[]): { aligned: boolean; count: number; strength: number } {
  const nonNeutral = directions.filter(d => d !== 'neutral')
  if (nonNeutral.length === 0) {
    return { aligned: false, count: 0, strength: 0 }
  }

  // Count each direction
  const longCount = nonNeutral.filter(d => d === 'long_spread').length
  const shortCount = nonNeutral.filter(d => d === 'short_spread').length

  // majorityDirection could be used for additional signaling in future
  const majorityCount = Math.max(longCount, shortCount)

  // Calculate alignment strength (majority count / total non-neutral)
  const strength = majorityCount / nonNeutral.length

  // Consider aligned if majority (>= 60%) agree on same direction
  const aligned = strength >= 0.6

  return {
    aligned,
    count: aligned ? majorityCount : 0,
    strength,
  }
}

/**
 * Analyze a pair across multiple timeframes for confluence
 *
 * Now supports custom intervals (e.g., "2m", "7m", "10m") that are resampled from 1m data.
 * These provide more granular confluence detection for scalping strategies.
 */
export function analyzeMultiTimeframeConfluence(
  timeframeData: Map<string, { primary: number[]; secondary: number[] }>,
  symbol: string,
  primarySymbol: string,
  options: ConfluenceOptions = {}
): ConfluenceResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const analyses: TimeframeAnalysis[] = []

  // Analyze each timeframe
  for (const interval of opts.intervals) {
    const data = timeframeData.get(interval)
    if (!data || data.primary.length === 0 || data.secondary.length === 0) {
      continue
    }

    const result = analyzePair(data.primary, data.secondary, symbol, primarySymbol, {
      computeCorrelationVelocity: true,
      computeVolatilityAdjustedSpread: true,
    })

    analyses.push({
      interval,
      result,
      weight: getIntervalWeight(interval),
    })
  }

  if (analyses.length === 0) {
    return createEmptyConfluenceResult(symbol, primarySymbol, opts.intervals.length)
  }

  // Calculate agreement metrics
  const zScores = analyses.map(a => a.result.spreadZScore)
  const correlations = analyses.map(a => a.result.correlation)
  const qualities = analyses.map(a => a.result.volatilitySpread.signalQuality)
  const directions = analyses.map(a => determineSignalDirection([a.result.spreadZScore]))

  const zScoreAgreement = calculateAgreement(zScores.map(z => Math.abs(z)))
  const correlationAgreement = calculateAgreement(correlations.map(c => Math.abs(c)))

  // Quality agreement: what % have same quality category
  const qualityCounts = qualities.reduce(
    (acc, q) => {
      acc[q] = (acc[q] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
  const maxQualityCount = Math.max(...Object.values(qualityCounts))
  const qualityAgreement = maxQualityCount / qualities.length

  // Calculate weighted average opportunity
  const totalWeight = analyses.reduce((sum, a) => sum + a.weight, 0)
  const weightedOpportunity =
    analyses.reduce((sum, a) => sum + a.result.opportunityScore * a.weight, 0) / totalWeight

  // Find best and worst timeframes
  const sortedByScore = [...analyses].sort(
    (a, b) => b.result.opportunityScore - a.result.opportunityScore
  )
  const bestTimeframe = sortedByScore[0]?.interval || null
  const worstTimeframe = sortedByScore[sortedByScore.length - 1]?.interval || null

  // Determine signal alignment
  const alignmentResult = signalsAlign(directions)
  const alignedCount = alignmentResult.count

  // Determine overall confidence based on multiple factors
  let confidence: 'high' | 'medium' | 'low' | 'mixed'
  const hasGoodAlignment = alignmentResult.strength >= 0.7
  const hasModerateAlignment = alignmentResult.strength >= 0.5

  if (hasGoodAlignment && zScoreAgreement > 0.7 && qualityAgreement > 0.6 && alignedCount >= 3) {
    confidence = 'high'
  } else if (
    hasModerateAlignment &&
    zScoreAgreement > 0.5 &&
    qualityAgreement > 0.4 &&
    alignedCount >= 2
  ) {
    confidence = 'medium'
  } else if (alignmentResult.aligned) {
    confidence = 'low'
  } else {
    confidence = 'mixed'
  }

  // Sanity check: if all opportunity scores are exactly the same (especially 100), something is wrong
  const uniqueOpportunityScores = new Set(analyses.map(a => a.result.opportunityScore))
  const allScoresIdentical = uniqueOpportunityScores.size === 1

  if (allScoresIdentical && analyses.length > 2) {
    console.warn(
      `[MTF] Suspicious: All ${analyses.length} intervals have identical opportunity score: ${analyses[0].result.opportunityScore}`
    )
  }

  // Calculate confluence score (0-100) with balanced weighting
  // Now that opportunity scores properly vary (no longer saturate at 100),
  // we can weight them more heavily
  // Components:
  // - Base opportunity (50%): weighted average opportunity score
  // - Alignment bonus (20%): based on signal direction agreement
  // - Agreement factor (15%): consistency across timeframes
  // - Quality bonus (10%): premium/strong signal quality count
  // - Variance bonus (5%): actually varying across timeframes = data quality

  const baseOpportunity = weightedOpportunity * 0.5
  const alignmentBonus = alignmentResult.strength * 20
  const agreementFactor = ((zScoreAgreement + correlationAgreement + qualityAgreement) / 3) * 15
  const premiumCount = analyses.filter(
    a =>
      a.result.volatilitySpread.signalQuality === 'premium' ||
      a.result.volatilitySpread.signalQuality === 'strong'
  ).length
  const qualityBonus = Math.min(10, (premiumCount / analyses.length) * 10)

  // Variance bonus: reward when scores actually vary (indicates real data, not duplicates)
  const scoreVariance = uniqueOpportunityScores.size / analyses.length
  const varianceBonus = scoreVariance >= 0.5 ? 5 : scoreVariance * 10

  // Data quality penalty - only apply if identical AND all scores are very high
  const avgScore = weightedOpportunity
  const dataQualityPenalty = allScoresIdentical && analyses.length > 2 && avgScore > 80 ? 20 : 0

  const confluenceScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        baseOpportunity +
          alignmentBonus +
          agreementFactor +
          qualityBonus +
          varianceBonus -
          dataQualityPenalty
      )
    )
  )

  // Signal direction
  const signalDirection = determineSignalDirection(zScores)

  // Build notes
  const notes = buildConfluenceNotes(
    analyses,
    confidence,
    alignedCount,
    signalDirection,
    zScoreAgreement,
    qualityAgreement,
    allScoresIdentical
  )

  return {
    symbol,
    primarySymbol,
    confluenceScore,
    confidence,
    timeframeAnalyses: analyses,
    alignedTimeframes: alignedCount,
    totalTimeframes: analyses.length,
    averageOpportunity: Math.round(weightedOpportunity),
    bestTimeframe,
    worstTimeframe,
    signalDirection,
    zScoreAgreement: Math.round(zScoreAgreement * 100) / 100,
    correlationAgreement: Math.round(correlationAgreement * 100) / 100,
    qualityAgreement: Math.round(qualityAgreement * 100) / 100,
    notes,
  }
}

function buildConfluenceNotes(
  analyses: TimeframeAnalysis[],
  confidence: string,
  alignedCount: number,
  direction: string,
  zScoreAgreement: number,
  qualityAgreement: number,
  allScoresIdentical?: boolean
): string[] {
  const notes: string[] = []

  // Data quality warning
  if (allScoresIdentical && analyses.length > 2) {
    notes.push(
      '⚠️ Data quality issue: All intervals show identical scores. Try clearing cache or using different intervals.'
    )
  }

  // Confidence summary
  const confidenceEmoji = {
    high: '🟢',
    medium: '🟡',
    low: '🟠',
    mixed: '🔴',
  }
  notes.push(
    `${confidenceEmoji[confidence as keyof typeof confidenceEmoji]} ${confidence.toUpperCase()} confidence: ${alignedCount}/${analyses.length} timeframes aligned`
  )

  // Direction note
  if (direction !== 'neutral') {
    const action =
      direction === 'long_spread'
        ? 'LONG spread (buy primary, sell secondary)'
        : 'SHORT spread (sell primary, buy secondary)'
    notes.push(`📊 Suggested: ${action}`)
  }

  // Agreement quality
  if (zScoreAgreement > 0.8) {
    notes.push('✅ Strong Z-score agreement across timeframes')
  } else if (zScoreAgreement < 0.4) {
    notes.push('⚠️ Z-scores diverge between timeframes - caution advised')
  }

  if (qualityAgreement > 0.7) {
    notes.push('✅ Consistent signal quality across all timeframes')
  }

  // Best timeframe highlight
  const best = analyses.reduce((max, a) =>
    a.result.opportunityScore > max.result.opportunityScore ? a : max
  )
  if (best.result.opportunityScore > 60) {
    notes.push(
      `⭐ Strongest signal on ${best.interval} timeframe (${best.result.opportunityScore}%)`
    )
  }

  // Specific timeframe notes
  const premiumCount = analyses.filter(
    a => a.result.volatilitySpread.signalQuality === 'premium'
  ).length
  if (premiumCount >= 2) {
    notes.push(`💎 ${premiumCount} timeframes show premium quality`)
  }

  return notes
}

function createEmptyConfluenceResult(
  symbol: string,
  primarySymbol: string,
  totalTimeframes: number
): ConfluenceResult {
  return {
    symbol,
    primarySymbol,
    confluenceScore: 0,
    confidence: 'low',
    timeframeAnalyses: [],
    alignedTimeframes: 0,
    totalTimeframes,
    averageOpportunity: 0,
    bestTimeframe: null,
    worstTimeframe: null,
    signalDirection: 'neutral',
    zScoreAgreement: 0,
    correlationAgreement: 0,
    qualityAgreement: 0,
    notes: ['Insufficient data for multi-timeframe analysis'],
  }
}

/**
 * Get confluence intervals with labels (native + custom resampled)
 */
export function getConfluenceIntervalOptions(): {
  value: string
  label: string
  description: string
  isNative: boolean
}[] {
  return [
    // Native Binance intervals
    { value: '1m', label: '1m', description: 'Ultra-fast scalping', isNative: true },
    { value: '3m', label: '3m', description: 'Quick scalping', isNative: true },
    { value: '5m', label: '5m', description: 'Scalping standard', isNative: true },
    { value: '15m', label: '15m', description: 'Intraday momentum', isNative: true },
    { value: '1h', label: '1h', description: 'Primary trend', isNative: true },
    { value: '4h', label: '4h', description: 'Swing alignment', isNative: true },
    { value: '1d', label: '1d', description: 'Long-term context', isNative: true },
    // Custom resampled intervals
    { value: '2m', label: '2m', description: 'Resampled from 1m', isNative: false },
    { value: '4m', label: '4m', description: 'Resampled from 1m', isNative: false },
    { value: '6m', label: '6m', description: 'Resampled from 1m', isNative: false },
    { value: '7m', label: '7m', description: 'Resampled from 1m', isNative: false },
    { value: '8m', label: '8m', description: 'Resampled from 1m', isNative: false },
    { value: '9m', label: '9m', description: 'Resampled from 1m', isNative: false },
    { value: '10m', label: '10m', description: 'Resampled from 1m', isNative: false },
  ]
}

/**
 * Suggest optimal timeframe combination based on trading style
 */
export function getSuggestedTimeframes(
  style: 'scalping' | 'intraday' | 'swing' | 'ultra-scalp'
): string[] {
  switch (style) {
    case 'ultra-scalp':
      // Maximum granularity with resampled intervals
      return ['1m', '2m', '3m', '4m', '5m']
    case 'scalping':
      // Good mix of native and custom for scalping
      return ['1m', '3m', '5m', '7m', '10m', '15m']
    case 'intraday':
      return ['5m', '15m', '1h']
    case 'swing':
      return ['1h', '4h', '1d']
    default:
      return DEFAULT_CONFLUENCE_INTERVALS
  }
}
