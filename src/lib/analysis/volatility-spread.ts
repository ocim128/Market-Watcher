/**
 * Volatility-adjusted spread analysis
 * Ported from .NET StatisticalAnalysis.CalculateVolatilityAdjustedSpread
 * 
 * High spread with low volatility = stronger signal
 */

import {
    mean,
    standardDeviation,
    calculateReturns,
    calculateSpread,
    clamp,
} from "./statistics"
import type { VolatilityAdjustedSpreadResult, SignalQuality } from "@/types"

const EPSILON = 1e-12

/**
 * Calculate volatility-adjusted spread
 * Normalizes spread by combined volatility - high spread + low volatility = premium signal
 */
export function calculateVolatilityAdjustedSpread(
    primary: number[],
    secondary: number[],
    lookbackPeriod: number = 20
): VolatilityAdjustedSpreadResult {
    const count = Math.min(primary.length, secondary.length)

    if (count < 2) {
        return {
            rawZScore: 0,
            adjustedZScore: 0,
            combinedVolatility: 0,
            primaryVolatility: 0,
            secondaryVolatility: 0,
            signalStrength: 0,
            signalQuality: "insufficient_data",
        }
    }

    // Calculate returns for volatility
    const returnsPrimary = calculateReturns(primary)
    const returnsSecondary = calculateReturns(secondary)

    // Calculate current volatility (standard deviation of returns)
    const volPeriod = Math.min(lookbackPeriod, returnsPrimary.length)
    const recentPrimaryReturns = returnsPrimary.slice(-volPeriod)
    const recentSecondaryReturns = returnsSecondary.slice(-volPeriod)

    const volPrimary = standardDeviation(recentPrimaryReturns, mean(recentPrimaryReturns))
    const volSecondary = standardDeviation(recentSecondaryReturns, mean(recentSecondaryReturns))

    // Combined volatility (root mean square)
    const combinedVolatility = Math.sqrt(
        (volPrimary * volPrimary + volSecondary * volSecondary) / 2
    )

    // Calculate spread
    const spread = calculateSpread(primary, secondary)
    const currentSpread = spread[spread.length - 1]
    const spreadMean = mean(spread)
    const spreadStd = standardDeviation(spread, spreadMean)

    // Standard Z-score
    const rawZScore = spreadStd > EPSILON ? (currentSpread - spreadMean) / spreadStd : 0

    // Volatility-adjusted Z-score: amplify signal when volatility is low
    // Higher combined volatility = divide more = smaller signal (noise)
    // Lower combined volatility = divide less = larger signal (stronger)
    const volatilityFactor =
        combinedVolatility > EPSILON ? 1.0 / (1.0 + combinedVolatility * 10) : 1.0
    const adjustedZScore = rawZScore * (1.0 + volatilityFactor)

    // Calculate signal strength (0-100) using logarithmic scaling
    // This prevents saturation at 100 for high Z-scores
    // Z=1 → ~33, Z=2 → ~50, Z=3 → ~60, Z=5 → ~71
    const absAdjustedZ = Math.abs(adjustedZScore)
    const signalStrength = clamp((1 - 1 / (1 + absAdjustedZ * 0.5)) * 100, 0, 85)

    // Determine signal quality
    const signalQuality = determineSignalQuality(adjustedZScore, rawZScore, combinedVolatility)

    return {
        rawZScore,
        adjustedZScore,
        combinedVolatility,
        primaryVolatility: volPrimary,
        secondaryVolatility: volSecondary,
        signalStrength,
        signalQuality,
    }
}

/**
 * Determine signal quality based on adjusted Z-score and volatility
 */
function determineSignalQuality(
    adjustedZ: number,
    rawZ: number,
    volatility: number
): SignalQuality {
    const absAdjusted = Math.abs(adjustedZ)

    // High spread, low volatility = premium signal
    if (absAdjusted >= 2.0 && volatility < 0.02) {
        return "premium"
    }

    // Good signal with reasonable volatility
    if (absAdjusted >= 1.5 && volatility < 0.04) {
        return "strong"
    }

    // Moderate signal
    if (absAdjusted >= 1.0) {
        return "moderate"
    }

    // High volatility makes signal unreliable
    if (volatility > 0.05) {
        return "noisy"
    }

    return "weak"
}
