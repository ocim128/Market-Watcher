/**
 * Notes builder for pair trading analysis
 * Ported from .NET ReportBuilder.BuildNotes
 */

import type {
    CorrelationVelocityResult,
    VolatilityAdjustedSpreadResult,
} from "@/types"

/**
 * Build trading notes based on analysis results
 */
export function buildNotes(
    spreadZScore: number,
    correlation: number,
    correlationVelocity?: CorrelationVelocityResult,
    volatilitySpread?: VolatilityAdjustedSpreadResult
): string[] {
    const notes: string[] = []

    // Spread Z-score notes
    const absZ = Math.abs(spreadZScore)
    if (absZ >= 2) {
        notes.push(
            `Spread Z-score ${formatSigned(spreadZScore, 2)}σ: consider mean-reversion entry.`
        )
    } else if (absZ >= 1) {
        notes.push(`Spread Z-score ${formatSigned(spreadZScore, 2)}σ: divergence building.`)
    } else {
        notes.push("Spread is near its mean; low divergence right now.")
    }

    // Correlation notes
    const absCorr = Math.abs(correlation)
    if (absCorr >= 0.7) {
        notes.push(`Returns correlation is strong (${formatSigned(correlation, 2)}).`)
    } else if (absCorr >= 0.4) {
        notes.push(`Returns correlation is moderate (${formatSigned(correlation, 2)}).`)
    } else {
        notes.push(`Returns correlation is weak (${formatSigned(correlation, 2)}).`)
    }

    // Correlation Velocity notes
    if (correlationVelocity) {
        const cv = correlationVelocity
        switch (cv.regime) {
            case "breaking_down":
                notes.push(
                    `⚠️ REGIME CHANGE: Correlation breaking down (${formatSigned(cv.velocity, 4)}/bar). Avoid new positions.`
                )
                break
            case "weakening":
                notes.push(
                    `⚡ Correlation weakening (${formatSigned(cv.velocity, 4)}/bar). Monitor for regime change.`
                )
                break
            case "recovering":
                notes.push(
                    `📈 Correlation recovering (${formatSigned(cv.velocity, 4)}/bar). Potential opportunity emerging.`
                )
                break
            case "strengthening":
                notes.push(
                    `🔥 Correlation strengthening (${formatSigned(cv.velocity, 4)}/bar). Favorable conditions.`
                )
                break
            case "stable_strong":
                notes.push("✅ Correlation stable and strong. Good for pair trading.")
                break
            case "stable_weak":
                notes.push("⚠️ Correlation stable but weak. Not ideal for pair trading.")
                break
        }

        // Acceleration note
        if (Math.abs(cv.acceleration) > 0.001) {
            const accelDir = cv.acceleration > 0 ? "accelerating" : "decelerating"
            notes.push(`Correlation velocity is ${accelDir} (${formatSigned(cv.acceleration, 5)}).`)
        }
    }

    // Volatility-Adjusted Spread notes
    if (volatilitySpread) {
        const vs = volatilitySpread
        switch (vs.signalQuality) {
            case "premium":
                notes.push(
                    `💎 PREMIUM SIGNAL: High spread (${formatSigned(vs.adjustedZScore, 2)}) with low volatility. Best opportunity.`
                )
                break
            case "strong":
                notes.push(
                    `💪 Strong signal quality (adj. Z: ${formatSigned(vs.adjustedZScore, 2)}). Good opportunity.`
                )
                break
            case "moderate":
                notes.push(
                    `📊 Moderate signal quality (adj. Z: ${formatSigned(vs.adjustedZScore, 2)}). Proceed with caution.`
                )
                break
            case "noisy":
                notes.push(
                    `🔊 High volatility (${formatPercent(vs.combinedVolatility)}) makes signal noisy. Wait for calmer conditions.`
                )
                break
            case "weak":
                notes.push("📉 Weak signal. No clear opportunity at this time.")
                break
        }

        // Volatility imbalance note
        if (vs.primaryVolatility > 0 && vs.secondaryVolatility > 0) {
            const volRatio = vs.primaryVolatility / vs.secondaryVolatility
            if (volRatio > 2.0 || volRatio < 0.5) {
                const higher = volRatio > 1 ? "Primary" : "Secondary"
                const ratio = Math.max(volRatio, 1 / volRatio)
                notes.push(`⚖️ Volatility imbalance: ${higher} is ${ratio.toFixed(1)}x more volatile.`)
            }
        }
    }

    return notes
}

function formatSigned(value: number, decimals: number): string {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(decimals)}`
}

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`
}
