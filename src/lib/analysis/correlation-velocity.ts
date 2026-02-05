/**
 * Correlation velocity analysis - detects regime changes in correlation
 * Ported from .NET StatisticalAnalysis.CalculateCorrelationVelocity
 */

import { pearsonCorrelation } from './statistics'
import type { CorrelationVelocityResult, CorrelationRegime } from '@/types'

const STRONG_THRESHOLD = 0.7
const WEAK_THRESHOLD = 0.3
const VELOCITY_THRESHOLD = 0.01

/**
 * Calculate correlation velocity - rate of change in rolling correlation
 * Useful for detecting regime changes in pair relationships
 */
export function calculateCorrelationVelocity(
  returnsPrimary: number[],
  returnsSecondary: number[],
  windowSize: number = 50,
  velocityLookback: number = 10
): CorrelationVelocityResult {
  const count = Math.min(returnsPrimary.length, returnsSecondary.length)

  // Not enough data - return current correlation with zero velocity
  if (count < windowSize + velocityLookback) {
    const currentCorr = pearsonCorrelation(returnsPrimary, returnsSecondary)
    return {
      currentCorrelation: currentCorr,
      previousCorrelation: currentCorr,
      velocity: 0,
      acceleration: 0,
      regime: 'stable',
    }
  }

  // Calculate rolling correlations
  const rollingCorrelations: number[] = []
  for (let i = windowSize; i <= count; i++) {
    const startIdx = i - windowSize
    const windowPrimary = returnsPrimary.slice(startIdx, i)
    const windowSecondary = returnsSecondary.slice(startIdx, i)
    rollingCorrelations.push(pearsonCorrelation(windowPrimary, windowSecondary))
  }

  if (rollingCorrelations.length < velocityLookback + 1) {
    const currentCorr =
      rollingCorrelations.length > 0 ? rollingCorrelations[rollingCorrelations.length - 1] : 0
    return {
      currentCorrelation: currentCorr,
      previousCorrelation: currentCorr,
      velocity: 0,
      acceleration: 0,
      regime: 'stable',
    }
  }

  const currentCorrelation = rollingCorrelations[rollingCorrelations.length - 1]
  const previousCorrelation = rollingCorrelations[rollingCorrelations.length - 1 - velocityLookback]

  // Velocity = change per period
  const velocity = (currentCorrelation - previousCorrelation) / velocityLookback

  // Calculate acceleration by looking at velocity change
  let acceleration = 0
  if (rollingCorrelations.length >= 2 * velocityLookback + 1) {
    const previousVelocity =
      (rollingCorrelations[rollingCorrelations.length - 1 - velocityLookback] -
        rollingCorrelations[rollingCorrelations.length - 1 - 2 * velocityLookback]) /
      velocityLookback
    acceleration = velocity - previousVelocity
  }

  // Determine regime
  const regime = determineCorrelationRegime(currentCorrelation, velocity, previousCorrelation)

  return {
    currentCorrelation,
    previousCorrelation,
    velocity,
    acceleration,
    regime,
  }
}

/**
 * Determine the correlation regime based on current value and velocity
 */
export function determineCorrelationRegime(
  current: number,
  velocity: number,
  previous: number
): CorrelationRegime {
  const currentStrength = Math.abs(current)
  const previousStrength = Math.abs(previous)

  if (Math.abs(velocity) > VELOCITY_THRESHOLD) {
    if (currentStrength > previousStrength) {
      return currentStrength >= STRONG_THRESHOLD ? 'strengthening' : 'recovering'
    }
    if (currentStrength < previousStrength) {
      return currentStrength <= WEAK_THRESHOLD ? 'breaking_down' : 'weakening'
    }
  }

  if (currentStrength >= STRONG_THRESHOLD) {
    return 'stable_strong'
  }
  if (currentStrength <= WEAK_THRESHOLD) {
    return 'stable_weak'
  }

  return 'stable'
}
