/**
 * Multi-timeframe confluence analysis utilities
 */

import type { ConfluenceResult, TimeframeAnalysis } from './multi-timeframe-types'
import { TIMEFRAME_WEIGHTS, DEFAULT_CONFLUENCE_INTERVALS } from './multi-timeframe-types'

export function getIntervalWeight(interval: string): number {
  if (TIMEFRAME_WEIGHTS[interval] !== undefined) {
    return TIMEFRAME_WEIGHTS[interval]
  }

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

  const logMin = Math.log(1)
  const logMax = Math.log(60)
  const logCurrent = Math.log(Math.max(1, Math.min(minutes, 60)))

  const weight = 0.5 + 0.5 * ((logCurrent - logMin) / (logMax - logMin))
  return Math.max(0.5, Math.min(1.0, weight))
}

export function calculateAgreement(values: number[]): number {
  if (values.length < 2) {
    return 1
  }

  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const stdDev = Math.sqrt(variance)

  return Math.max(0, 1 - stdDev / 2)
}

export function determineSignalDirection(
  zScores: number[]
): 'long_spread' | 'short_spread' | 'neutral' {
  const avgZScore = zScores.reduce((a, b) => a + b, 0) / zScores.length

  if (avgZScore > 1) {
    return 'short_spread'
  }
  if (avgZScore < -1) {
    return 'long_spread'
  }
  return 'neutral'
}

export function signalsAlign(directions: string[]): {
  aligned: boolean
  count: number
  strength: number
} {
  const nonNeutral = directions.filter(d => d !== 'neutral')
  if (nonNeutral.length === 0) {
    return { aligned: false, count: 0, strength: 0 }
  }

  const longCount = nonNeutral.filter(d => d === 'long_spread').length
  const shortCount = nonNeutral.filter(d => d === 'short_spread').length
  const majorityCount = Math.max(longCount, shortCount)
  const strength = majorityCount / nonNeutral.length
  const aligned = strength >= 0.6

  return { aligned, count: aligned ? majorityCount : 0, strength }
}

export function calculateConfluenceScore(
  weightedOpportunity: number,
  alignmentStrength: number,
  zScoreAgreement: number,
  correlationAgreement: number,
  qualityAgreement: number,
  analyses: TimeframeAnalysis[],
  allScoresIdentical: boolean
): number {
  const baseOpportunity = weightedOpportunity * 0.5
  const alignmentBonus = alignmentStrength * 20
  const agreementFactor = ((zScoreAgreement + correlationAgreement + qualityAgreement) / 3) * 15

  const premiumCount = analyses.filter(
    a =>
      a.result.volatilitySpread.signalQuality === 'premium' ||
      a.result.volatilitySpread.signalQuality === 'strong'
  ).length
  const qualityBonus = Math.min(10, (premiumCount / analyses.length) * 10)

  const uniqueScores = new Set(analyses.map(a => a.result.opportunityScore))
  const scoreVariance = uniqueScores.size / analyses.length
  const varianceBonus = scoreVariance >= 0.5 ? 5 : scoreVariance * 10

  const dataQualityPenalty =
    allScoresIdentical && analyses.length > 2 && weightedOpportunity > 80 ? 20 : 0

  return Math.max(
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
}

export function determineConfidence(
  alignmentStrength: number,
  zScoreAgreement: number,
  qualityAgreement: number,
  alignedCount: number,
  isAligned: boolean
): 'high' | 'medium' | 'low' | 'mixed' {
  const hasGoodAlignment = alignmentStrength >= 0.7
  const hasModerateAlignment = alignmentStrength >= 0.5

  if (hasGoodAlignment && zScoreAgreement > 0.7 && qualityAgreement > 0.6 && alignedCount >= 3) {
    return 'high'
  }
  if (
    hasModerateAlignment &&
    zScoreAgreement > 0.5 &&
    qualityAgreement > 0.4 &&
    alignedCount >= 2
  ) {
    return 'medium'
  }
  if (isAligned) {
    return 'low'
  }
  return 'mixed'
}

export function buildConfluenceNotes(
  analyses: TimeframeAnalysis[],
  confidence: string,
  alignedCount: number,
  direction: string,
  zScoreAgreement: number,
  qualityAgreement: number,
  allScoresIdentical?: boolean,
  primarySymbol?: string,
  symbol?: string
): string[] {
  const notes: string[] = []

  if (allScoresIdentical && analyses.length > 2) {
    notes.push(
      '⚠️ Data quality issue: All intervals show identical scores. Try clearing cache or using different intervals.'
    )
  }

  const confidenceEmoji = { high: '🟢', medium: '🟡', low: '🟠', mixed: '🔴' }
  notes.push(
    `${confidenceEmoji[confidence as keyof typeof confidenceEmoji]} ${confidence.toUpperCase()} confidence: ${alignedCount}/${analyses.length} timeframes aligned`
  )

  if (direction !== 'neutral') {
    const primaryLabel = (primarySymbol ?? 'primary').replace('USDT', '')
    const secondaryLabel = (symbol ?? 'secondary').replace('USDT', '')
    const action =
      direction === 'long_spread'
        ? `LONG spread (LONG ${primaryLabel}, SHORT ${secondaryLabel})`
        : `SHORT spread (SHORT ${primaryLabel}, LONG ${secondaryLabel})`
    notes.push(`📊 Suggested: ${action}`)
  }

  if (zScoreAgreement > 0.8) {
    notes.push('✅ Strong Z-score agreement across timeframes')
  } else if (zScoreAgreement < 0.4) {
    notes.push('⚠️ Z-scores diverge between timeframes - caution advised')
  }

  if (qualityAgreement > 0.7) {
    notes.push('✅ Consistent signal quality across all timeframes')
  }

  const best = analyses.reduce((max, a) =>
    a.result.opportunityScore > max.result.opportunityScore ? a : max
  )
  if (best.result.opportunityScore > 60) {
    notes.push(
      `⭐ Strongest signal on ${best.interval} timeframe (${best.result.opportunityScore}%)`
    )
  }

  const premiumCount = analyses.filter(
    a => a.result.volatilitySpread.signalQuality === 'premium'
  ).length
  if (premiumCount >= 2) {
    notes.push(`💎 ${premiumCount} timeframes show premium quality`)
  }

  return notes
}

export function createEmptyConfluenceResult(
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

export function getConfluenceIntervalOptions(): {
  value: string
  label: string
  description: string
  isNative: boolean
}[] {
  return [
    { value: '1m', label: '1m', description: 'Ultra-fast scalping', isNative: true },
    { value: '3m', label: '3m', description: 'Quick scalping', isNative: true },
    { value: '5m', label: '5m', description: 'Scalping standard', isNative: true },
    { value: '15m', label: '15m', description: 'Intraday momentum', isNative: true },
    { value: '1h', label: '1h', description: 'Primary trend', isNative: true },
    { value: '4h', label: '4h', description: 'Swing alignment', isNative: true },
    { value: '1d', label: '1d', description: 'Long-term context', isNative: true },
    { value: '2m', label: '2m', description: 'Resampled from 1m', isNative: false },
    { value: '4m', label: '4m', description: 'Resampled from 1m', isNative: false },
    { value: '6m', label: '6m', description: 'Resampled from 1m', isNative: false },
    { value: '7m', label: '7m', description: 'Resampled from 1m', isNative: false },
    { value: '8m', label: '8m', description: 'Resampled from 1m', isNative: false },
    { value: '9m', label: '9m', description: 'Resampled from 1m', isNative: false },
    { value: '10m', label: '10m', description: 'Resampled from 1m', isNative: false },
  ]
}

export function getSuggestedTimeframes(
  style: 'scalping' | 'intraday' | 'swing' | 'ultra-scalp'
): string[] {
  switch (style) {
    case 'ultra-scalp':
      return ['1m', '2m', '3m', '4m', '5m']
    case 'scalping':
      return ['1m', '3m', '5m', '7m', '10m', '15m']
    case 'intraday':
      return ['5m', '15m', '1h']
    case 'swing':
      return ['1h', '4h', '1d']
    default:
      return DEFAULT_CONFLUENCE_INTERVALS
  }
}
