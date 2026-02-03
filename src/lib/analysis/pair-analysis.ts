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
} from "./statistics"
import { calculateCorrelationVelocity } from "./correlation-velocity"
import { calculateVolatilityAdjustedSpread } from "./volatility-spread"
import { buildNotes } from "./notes-builder"
import type { PairAnalysisResult } from "@/types"

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

/**
 * Analyze two price series for pair trading opportunities
 * 
 * @param primaryCloses - Primary pair close prices (e.g., ETHUSDT)
 * @param secondaryCloses - Secondary pair close prices (e.g., BTCUSDT)
 * @param secondarySymbol - Symbol name of the secondary pair
 * @param primarySymbol - Symbol name of the primary pair (default: primary)
 * @param options - Analysis options
 */
export function analyzePair(
    primaryCloses: number[],
    secondaryCloses: number[],
    secondarySymbol: string,
    primarySymbol: string = "primary",
    options: AnalyzeOptions = {}
): PairAnalysisResult {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    // Align series (use minimum length)
    const alignedLength = Math.min(primaryCloses.length, secondaryCloses.length)
    const alignedPrimary = primaryCloses.slice(-alignedLength)
    const alignedSecondary = secondaryCloses.slice(-alignedLength)

    if (alignedLength < 2) {
        return createEmptyResult(secondarySymbol, primarySymbol)
    }

    // Calculate returns
    const returnsPrimary = calculateReturns(alignedPrimary)
    const returnsSecondary = calculateReturns(alignedSecondary)

    // Calculate correlation
    const correlation = pearsonCorrelation(returnsPrimary, returnsSecondary)

    // Calculate spread and ratio
    const spread = calculateSpread(alignedPrimary, alignedSecondary)
    const ratioSeries = calculateRatio(alignedPrimary, alignedSecondary)

    const spreadMean = mean(spread)
    const spreadStd = standardDeviation(spread, spreadMean)
    const spreadZScore = spreadStd > 0 ? (spread[spread.length - 1] - spreadMean) / spreadStd : 0
    const ratio = ratioSeries.length > 0 ? ratioSeries[ratioSeries.length - 1] : 0

    // Optional: Correlation velocity
    let correlationVelocity = undefined
    if (opts.computeCorrelationVelocity) {
        correlationVelocity = calculateCorrelationVelocity(
            returnsPrimary,
            returnsSecondary,
            opts.correlationVelocityWindow,
            opts.correlationVelocityLookback
        )
    }

    // Optional: Volatility-adjusted spread
    let volatilitySpread = undefined
    if (opts.computeVolatilityAdjustedSpread) {
        volatilitySpread = calculateVolatilityAdjustedSpread(
            alignedPrimary,
            alignedSecondary,
            opts.volatilityLookbackPeriod
        )
    }

    // Calculate opportunity score with more nuanced formula
    // The old formula saturated at 100 too easily when |Z-score| >= 3

    // Use volatility-adjusted spread Z-score if available, otherwise raw spread Z
    const effectiveSpreadZ = volatilitySpread ? volatilitySpread.adjustedZScore : spreadZScore
    const absZ = Math.abs(effectiveSpreadZ)

    // Spread opportunity: Use logarithmic scaling to prevent saturation
    // Z-score of 1.0 → ~33%, 2.0 → ~50%, 3.0 → ~60%, 5.0 → ~72%
    // Max approaches ~85% even for very high Z-scores
    const spreadOpportunity = clamp(
        (1 - 1 / (1 + absZ * 0.5)) * 100,
        0,
        85  // Cap at 85 to never fully saturate from spread alone
    )

    // Correlation quality factor (0-1): Strong correlation = better opportunity
    // Pairs with weak correlation shouldn't score as high
    const correlationQuality = clamp(Math.abs(correlation), 0, 1)

    // Signal strength from volatility analysis (0-100)
    // Also cap this to prevent saturation
    const methodAverage = volatilitySpread
        ? clamp(volatilitySpread.signalStrength * 0.7, 0, 70)  // Max 70
        : 0

    // Combined opportunity score:
    // - 45% from spread Z-score (log scale, max ~85)
    // - 30% from volatility signal strength (max 70)
    // - 25% from correlation quality (0-100 based on |correlation|)
    const rawScore = (
        spreadOpportunity * 0.45 +
        methodAverage * 0.30 +
        correlationQuality * 25  // Max 25 points from correlation
    )

    // Apply final scaling - still clamp but scores should naturally vary more
    const opportunityScore = clamp(Math.round(rawScore), 0, 100)

    // Build notes
    const notes = buildNotes(spreadZScore, correlation, correlationVelocity, volatilitySpread)

    return {
        symbol: secondarySymbol,
        primarySymbol,
        timestamp: Date.now(),
        correlation,
        spreadMean,
        spreadStd,
        spreadZScore,
        ratio,
        alignedBars: alignedLength,
        opportunityScore,
        spreadOpportunity,
        methodAverage,
        volatilitySpread: volatilitySpread ?? {
            rawZScore: spreadZScore,
            adjustedZScore: spreadZScore,
            combinedVolatility: 0,
            primaryVolatility: 0,
            secondaryVolatility: 0,
            signalStrength: 0,
            signalQuality: "insufficient_data",
        },
        correlationVelocity: correlationVelocity ?? {
            currentCorrelation: correlation,
            previousCorrelation: correlation,
            velocity: 0,
            acceleration: 0,
            regime: "stable",
        },
        notes,
    }
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
            signalQuality: "insufficient_data",
        },
        correlationVelocity: {
            currentCorrelation: 0,
            previousCorrelation: 0,
            velocity: 0,
            acceleration: 0,
            regime: "stable",
        },
        notes: ["Insufficient data for analysis."],
    }
}

/**
 * Analyze multiple pairs against a primary pair
 */
export function analyzeAllPairs(
    primaryCloses: number[],
    pairsData: Array<{ symbol: string; closes: number[] }>,
    primarySymbol: string = "ETHUSDT",
    options: AnalyzeOptions = {}
): PairAnalysisResult[] {
    return pairsData.map((pair) =>
        analyzePair(primaryCloses, pair.closes, pair.symbol, primarySymbol, options)
    )
}
