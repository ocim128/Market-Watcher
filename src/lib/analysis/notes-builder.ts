/**
 * Notes builder for pair trading analysis
 * Ported from .NET ReportBuilder.BuildNotes
 */

import type { CorrelationVelocityResult, VolatilityAdjustedSpreadResult } from '@/types'

function buildSpreadNotes(spreadZScore: number, notes: string[]) {
  const absZ = Math.abs(spreadZScore)
  if (absZ >= 2) {
    notes.push(`Spread Z-score ${formatSigned(spreadZScore, 2)}σ: consider mean-reversion entry.`)
  } else if (absZ >= 1) {
    notes.push(`Spread Z-score ${formatSigned(spreadZScore, 2)}σ: divergence building.`)
  } else {
    notes.push('Spread is near its mean; low divergence right now.')
  }
}

function buildCorrelationNotes(correlation: number, notes: string[]) {
  const absCorr = Math.abs(correlation)
  if (absCorr >= 0.7) {
    notes.push(`Returns correlation is strong (${formatSigned(correlation, 2)}).`)
  } else if (absCorr >= 0.4) {
    notes.push(`Returns correlation is moderate (${formatSigned(correlation, 2)}).`)
  } else {
    notes.push(`Returns correlation is weak (${formatSigned(correlation, 2)}).`)
  }
}

const REGIME_NOTES: Record<string, (v: number) => string> = {
  breaking_down: v =>
    `⚠️ REGIME CHANGE: Correlation breaking down (${formatSigned(v, 4)}/bar). Avoid new positions.`,
  weakening: v =>
    `⚡ Correlation weakening (${formatSigned(v, 4)}/bar). Monitor for regime change.`,
  recovering: v =>
    `📈 Correlation recovering (${formatSigned(v, 4)}/bar). Potential opportunity emerging.`,
  strengthening: v =>
    `🔥 Correlation strengthening (${formatSigned(v, 4)}/bar). Favorable conditions.`,
  stable_strong: () => '✅ Correlation stable and strong. Good for pair trading.',
  stable_weak: () => '⚠️ Correlation stable but weak. Not ideal for pair trading.',
  stable: () => '➖ Correlation is stable.',
}

function buildVelocityNotes(cv: CorrelationVelocityResult, notes: string[]) {
  const note = REGIME_NOTES[cv.regime]
  if (note) {
    notes.push(note(cv.velocity))
  }

  if (Math.abs(cv.acceleration) > 0.001) {
    const accelDir = cv.acceleration > 0 ? 'accelerating' : 'decelerating'
    notes.push(`Correlation velocity is ${accelDir} (${formatSigned(cv.acceleration, 5)}).`)
  }
}

const QUALITY_NOTES: Record<string, (z: number, v?: number) => string> = {
  premium: z =>
    `💎 PREMIUM SIGNAL: High spread (${formatSigned(z, 2)}) with low volatility. Best opportunity.`,
  strong: z => `💪 Strong signal quality (adj. Z: ${formatSigned(z, 2)}). Good opportunity.`,
  moderate: z =>
    `📊 Moderate signal quality (adj. Z: ${formatSigned(z, 2)}). Proceed with caution.`,
  noisy: (_, v) =>
    `🔊 High volatility (${formatPercent(v ?? 0)}) makes signal noisy. Wait for calmer conditions.`,
  weak: () => '📉 Weak signal. No clear opportunity at this time.',
}

function buildVolatilityNotes(vs: VolatilityAdjustedSpreadResult, notes: string[]) {
  const note = QUALITY_NOTES[vs.signalQuality]
  if (note) {
    notes.push(note(vs.adjustedZScore, vs.combinedVolatility))
  }

  if (vs.primaryVolatility > 0 && vs.secondaryVolatility > 0) {
    const volRatio = vs.primaryVolatility / vs.secondaryVolatility
    if (volRatio > 2.0 || volRatio < 0.5) {
      const higher = volRatio > 1 ? 'Primary' : 'Secondary'
      notes.push(
        `⚖️ Volatility imbalance: ${higher} is ${Math.max(volRatio, 1 / volRatio).toFixed(1)}x more volatile.`
      )
    }
  }
}

export function buildNotes(
  spreadZScore: number,
  correlation: number,
  correlationVelocity?: CorrelationVelocityResult,
  volatilitySpread?: VolatilityAdjustedSpreadResult
): string[] {
  const notes: string[] = []

  buildSpreadNotes(spreadZScore, notes)
  buildCorrelationNotes(correlation, notes)

  if (correlationVelocity) {
    buildVelocityNotes(correlationVelocity, notes)
  }
  if (volatilitySpread) {
    buildVolatilityNotes(volatilitySpread, notes)
  }

  return notes
}

function formatSigned(value: number, decimals: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}`
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}
