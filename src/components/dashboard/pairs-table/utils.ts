/**
 * Utility functions for the pairs table
 */

import type { SignalQuality } from '@/types'

/**
 * Get CSS class for signal quality badge
 */
export function getSignalBadgeClass(quality: SignalQuality): string {
  switch (quality) {
    case 'premium':
      return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20 shadow-[0_0_12px_rgba(52,211,153,0.15)] font-semibold'
    case 'strong':
      return 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20 font-medium'
    case 'moderate':
      return 'bg-amber-400/10 text-amber-400 border-amber-400/20'
    case 'weak':
      return 'bg-slate-400/10 text-slate-400 border-slate-400/20'
    case 'noisy':
      return 'bg-rose-400/10 text-rose-400 border-rose-400/20'
    default:
      return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
  }
}

/**
 * Get display label for signal quality
 */
export function getSignalLabel(quality: SignalQuality): string {
  switch (quality) {
    case 'premium':
      return '💎 Premium'
    case 'strong':
      return '💪 Strong'
    case 'moderate':
      return '📊 Moderate'
    case 'weak':
      return '📉 Weak'
    case 'noisy':
      return '🔊 Noisy'
    case 'insufficient_data':
      return '⚠️ No Data'
    default:
      return quality
  }
}

/**
 * Get display label for correlation regime
 */
export function getRegimeLabel(regime: string): string {
  const labels: Record<string, string> = {
    stable_strong: '✅ Stable Strong',
    stable_weak: '⚠️ Stable Weak',
    stable: '➖ Stable',
    strengthening: '📈 Strengthening',
    recovering: '🔄 Recovering',
    weakening: '📉 Weakening',
    breaking_down: '🔻 Breaking Down',
  }
  return labels[regime] || regime
}

/**
 * Order mapping for signal quality sorting
 */
export const signalQualityOrder: Record<SignalQuality, number> = {
  premium: 5,
  strong: 4,
  moderate: 3,
  weak: 2,
  noisy: 1,
  insufficient_data: 0,
}

/**
 * Format last scan time for display
 */
export function formatLastScanTime(lastScanTime: Date | null): string {
  if (!lastScanTime) {
    return 'Never'
  }
  return lastScanTime.toLocaleTimeString()
}

/**
 * Get color class for correlation value
 */
export function getCorrelationColorClass(correlation: number): string {
  const absCorr = Math.abs(correlation)
  if (absCorr >= 0.7) {
    return 'text-emerald-400'
  }
  if (absCorr >= 0.4) {
    return 'text-yellow-400'
  }
  return 'text-muted-foreground'
}

/**
 * Get color class for Z-score value
 */
export function getZScoreColorClass(zScore: number): string {
  const absZ = Math.abs(zScore)
  if (absZ >= 2) {
    return 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.3)]'
  }
  if (absZ >= 1) {
    return 'text-pink-400'
  }
  return 'text-muted-foreground'
}

/**
 * Get color class for opportunity score
 */
export function getOpportunityScoreColorClass(score: number): string {
  if (score >= 70) {
    return 'text-emerald-400'
  }
  if (score >= 40) {
    return 'text-yellow-400'
  }
  return 'text-muted-foreground'
}

/**
 * Get gradient class for opportunity score bar
 */
export function getOpportunityScoreBarClass(score: number): string {
  if (score >= 70) {
    return 'bg-gradient-to-r from-emerald-500 to-emerald-300'
  }
  if (score >= 40) {
    return 'bg-yellow-500'
  }
  return 'bg-muted-foreground'
}

/**
 * Get CSS class for confluence rating badge (Feature #1)
 */
export function getConfluenceBadgeClass(rating: number): string {
  switch (rating) {
    case 3:
      return 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30 shadow-[0_0_12px_rgba(52,211,153,0.15)] font-semibold'
    case 2:
      return 'bg-amber-400/10 text-amber-400 border-amber-400/20 font-medium'
    case 1:
      return 'bg-slate-400/10 text-slate-400 border-slate-400/20'
    default:
      return 'bg-slate-500/5 text-slate-500 border-slate-500/20'
  }
}

/**
 * Get color class for confluence rating text
 */
export function getConfluenceColorClass(rating: number): string {
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
 * Get display label for confluence rating
 */
export function getConfluenceLabel(rating: number): string {
  switch (rating) {
    case 3:
      return 'Strong'
    case 2:
      return 'Moderate'
    case 1:
      return 'Weak'
    default:
      return 'None'
  }
}
