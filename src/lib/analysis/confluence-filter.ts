/**
 * Multi-method Confluence Filter for Advanced Signal Detection
 *
 * Requires at least 2 of 3 indicators to agree before flagging an opportunity:
 * 1. Z-score > 2σ (extreme spread divergence)
 * 2. Correlation velocity showing 'strengthening' or 'recovering'
 * 3. Volatility-adjusted signal marked 'premium' or 'strong'
 */

import type {
  PairAnalysisResult,
  SignalQuality,
  CorrelationRegime,
  ConfluenceIndicator,
  ConfluenceAnalysis,
} from '@/types'

// Re-export types for backwards compatibility
export type { ConfluenceIndicator, ConfluenceAnalysis } from '@/types'

// Z-score threshold for extreme divergence
const ZSCORE_THRESHOLD = 2.0

// Signal qualities considered strong
const STRONG_QUALITIES: SignalQuality[] = ['premium', 'strong']

// Correlation regimes indicating strengthening relationship
const STRENGTHENING_REGIMES: CorrelationRegime[] = ['strengthening', 'recovering', 'stable_strong']

/**
 * Calculate confluence rating for a pair analysis result
 * Returns a rating from 0-3 based on how many indicators agree
 */
export function calculateConfluence(result: PairAnalysisResult): ConfluenceAnalysis {
  // Check each indicator
  const zScoreExtreme = Math.abs(result.spreadZScore) > ZSCORE_THRESHOLD

  const correlationStrengthening = STRENGTHENING_REGIMES.includes(result.correlationVelocity.regime)

  const signalQualityStrong = STRONG_QUALITIES.includes(result.volatilitySpread.signalQuality)

  // Calculate rating (0-3)
  const rating = [zScoreExtreme, correlationStrengthening, signalQualityStrong].filter(
    Boolean
  ).length

  // Determine signal direction
  let direction: 'long_spread' | 'short_spread' | 'neutral' = 'neutral'
  if (result.spreadZScore > ZSCORE_THRESHOLD) {
    direction = 'short_spread' // Spread is high, expect mean reversion down
  } else if (result.spreadZScore < -ZSCORE_THRESHOLD) {
    direction = 'long_spread' // Spread is low, expect mean reversion up
  }

  // Build indicator details for display
  const indicatorDetails: ConfluenceIndicator[] = [
    {
      name: 'Z-Score Extreme',
      active: zScoreExtreme,
      value: `${result.spreadZScore >= 0 ? '+' : ''}${result.spreadZScore.toFixed(2)}σ`,
    },
    {
      name: 'Correlation Strengthening',
      active: correlationStrengthening,
      value: result.correlationVelocity.regime.replace(/_/g, ' '),
    },
    {
      name: 'Signal Quality Strong',
      active: signalQualityStrong,
      value: result.volatilitySpread.signalQuality,
    },
  ]

  // Rating labels
  const ratingLabels: Record<number, string> = {
    0: 'No Confluence',
    1: 'Weak Confluence',
    2: 'Moderate Confluence',
    3: 'Strong Confluence',
  }

  return {
    rating,
    ratingLabel: ratingLabels[rating],
    indicators: {
      zScoreExtreme,
      correlationStrengthening,
      signalQualityStrong,
    },
    indicatorDetails,
    meetsThreshold: rating >= 2,
    direction,
  }
}

/**
 * Get CSS color class based on confluence rating
 */
export function getConfluenceRatingColorClass(rating: number): string {
  switch (rating) {
    case 3:
      return 'text-emerald-400'
    case 2:
      return 'text-amber-400'
    case 1:
      return 'text-slate-400'
    default:
      return 'text-slate-500'
  }
}

/**
 * Get background color class for confluence badge
 */
export function getConfluenceBadgeClass(rating: number): string {
  switch (rating) {
    case 3:
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    case 2:
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    case 1:
      return 'bg-slate-500/10 text-slate-400 border-slate-500/30'
    default:
      return 'bg-slate-500/5 text-slate-500 border-slate-500/20'
  }
}

/**
 * Filter results to only those meeting confluence threshold
 */
export function filterByConfluence(
  results: PairAnalysisResult[],
  minRating: number = 2
): PairAnalysisResult[] {
  return results.filter(result => {
    const confluence = calculateConfluence(result)
    return confluence.rating >= minRating
  })
}

/**
 * Sort results by confluence rating (highest first)
 */
export function sortByConfluence(
  results: PairAnalysisResult[]
): Array<{ result: PairAnalysisResult; confluence: ConfluenceAnalysis }> {
  return results
    .map(result => ({
      result,
      confluence: calculateConfluence(result),
    }))
    .sort((a, b) => b.confluence.rating - a.confluence.rating)
}
