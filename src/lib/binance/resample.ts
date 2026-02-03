/**
 * OHLCV Resampling Utilities
 * Aggregates lower timeframe data to create custom higher timeframes
 * e.g., convert 1m candles to 2m, 7m, 10m, etc.
 */

import type { BinanceKline } from "@/types"

export interface OHLCV {
    time: number
    open: number
    high: number
    low: number
    close: number
    volume: number
}

/**
 * Parse interval string to seconds
 * e.g., "1m" -> 60, "2m" -> 120, "1h" -> 3600
 */
export function getIntervalSeconds(interval: string): number {
    const unit = interval.slice(-1).toLowerCase()
    const value = parseInt(interval.slice(0, -1)) || 1

    switch (unit) {
        case 'm': return value * 60
        case 'h': return value * 3600
        case 'd': return value * 86400
        case 'w': return value * 604800
        case 'M': return value * 2592000 // 30 days approx
        default: return 60
    }
}

/**
 * Check if interval is natively supported by Binance
 */
export function isBinanceNativeInterval(interval: string): boolean {
    const nativeIntervals = new Set([
        '1m', '3m', '5m', '15m', '30m',
        '1h', '2h', '4h', '6h', '8h', '12h',
        '1d', '3d', '1w', '1M'
    ])
    return nativeIntervals.has(interval)
}

/**
 * Determine the best source interval to fetch and if resampling is needed
 * 
 * For custom intervals like 2m, 7m, 10m:
 * 1. Find the largest native interval that divides evenly into target
 * 2. Fetch that interval and resample up
 * 
 * Examples:
 * - 2m -> fetch 1m, resample 2:1
 * - 7m -> fetch 1m, resample 7:1  
 * - 10m -> fetch 5m, resample 2:1 (more efficient than 1m)
 * - 20m -> fetch 5m, resample 4:1
 */
export function resolveFetchInterval(interval: string): {
    sourceInterval: string
    needsResample: boolean
    ratio: number
} {
    // If native, no resampling needed
    if (isBinanceNativeInterval(interval)) {
        return { sourceInterval: interval, needsResample: false, ratio: 1 }
    }

    const targetSeconds = getIntervalSeconds(interval)

    // Find best source interval (largest that divides target evenly)
    const candidates = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d']
    let bestInterval = '1m'
    let bestSeconds = 60

    for (const candidate of candidates) {
        const seconds = getIntervalSeconds(candidate)

        // Must be smaller than target
        if (seconds >= targetSeconds) continue

        // Must divide evenly
        if (targetSeconds % seconds !== 0) continue

        // Pick the largest valid one (fewest candles to fetch)
        if (seconds > bestSeconds) {
            bestSeconds = seconds
            bestInterval = candidate
        }
    }

    const ratio = targetSeconds / bestSeconds

    return {
        sourceInterval: bestInterval,
        needsResample: true,
        ratio
    }
}

/**
 * Convert Binance kline format to OHLCV
 */
export function klineToOHLCV(kline: BinanceKline): OHLCV {
    return {
        time: kline.openTime,
        open: parseFloat(kline.open),
        high: parseFloat(kline.high),
        low: parseFloat(kline.low),
        close: parseFloat(kline.close),
        volume: parseFloat(kline.volume),
    }
}

/**
 * Resample OHLCV data to a higher timeframe
 * 
 * @param data - Source OHLCV data (must be sorted by time ascending)
 * @param targetInterval - Target interval string (e.g., "2m", "7m", "10m")
 * @returns Resampled OHLCV data
 */
export function resampleOHLCV(data: OHLCV[], targetInterval: string): OHLCV[] {
    if (data.length === 0) return []

    const targetSeconds = getIntervalSeconds(targetInterval)

    // If target is smaller than source, return original
    if (data.length >= 2) {
        const sourceIntervalSeconds = (data[1].time - data[0].time) / 1000
        if (targetSeconds <= sourceIntervalSeconds) {
            return data
        }
    }

    const resampled: OHLCV[] = []
    let currentBar: OHLCV | null = null
    let currentPeriodStart = -1

    for (const bar of data) {
        // Convert to seconds for calculation
        const timeSeconds = Math.floor(bar.time / 1000)
        const periodStartSeconds = Math.floor(timeSeconds / targetSeconds) * targetSeconds
        const periodStartMs = periodStartSeconds * 1000

        if (periodStartMs !== currentPeriodStart) {
            // Push previous bar if exists
            if (currentBar) {
                resampled.push(currentBar)
            }

            // Start new bar
            currentBar = {
                time: periodStartMs,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
                volume: bar.volume,
            }
            currentPeriodStart = periodStartMs
        } else if (currentBar) {
            // Aggregate into current bar
            currentBar.high = Math.max(currentBar.high, bar.high)
            currentBar.low = Math.min(currentBar.low, bar.low)
            currentBar.close = bar.close
            currentBar.volume += bar.volume
        }
    }

    // Push final bar
    if (currentBar) {
        resampled.push(currentBar)
    }

    return resampled
}

/**
 * Resample Binance kline data directly
 */
export function resampleKlines(klines: BinanceKline[], targetInterval: string): BinanceKline[] {
    if (klines.length === 0) return []

    const ohlcv = klines.map(klineToOHLCV)
    const resampled = resampleOHLCV(ohlcv, targetInterval)

    // Convert back to BinanceKline format
    return resampled.map((bar, index, arr) => {
        const targetSeconds = getIntervalSeconds(targetInterval)
        const nextBar = arr[index + 1]
        const closeTime = nextBar ? nextBar.time - 1 : bar.time + (targetSeconds * 1000) - 1

        return {
            openTime: bar.time,
            open: bar.open.toString(),
            high: bar.high.toString(),
            low: bar.low.toString(),
            close: bar.close.toString(),
            volume: bar.volume.toString(),
            closeTime,
            quoteAssetVolume: "0",
            numberOfTrades: 0,
            takerBuyBaseVolume: "0",
            takerBuyQuoteVolume: "0",
        }
    })
}

/**
 * Calculate how many source bars needed for target bars
 */
export function calculateRequiredBars(targetBars: number, targetInterval: string, sourceInterval: string): number {
    const targetSeconds = getIntervalSeconds(targetInterval)
    const sourceSeconds = getIntervalSeconds(sourceInterval)
    const ratio = targetSeconds / sourceSeconds

    // Add buffer for alignment issues
    return Math.ceil(targetBars * ratio * 1.1)
}

/**
 * Get all available custom intervals for MTF
 * Includes native Binance intervals + custom ones
 */
export function getAllAvailableIntervals(): string[] {
    const native = ['1m', '3m', '5m', '15m', '30m', '1h', '4h', '1d']
    const custom = [
        '2m', '4m', '6m', '7m', '8m', '9m', '10m',
        '20m', '25m', '35m', '40m', '45m', '50m',
        '90m', '2h', '3h', '5h', '7h', '8h', '10h'
    ]

    return [...native, ...custom]
}

/**
 * Get recommended custom intervals for scalping
 */
export function getScalpingIntervals(): { value: string; label: string; description: string }[] {
    return [
        { value: "1m", label: "1m", description: "Native - Ultra fast" },
        { value: "2m", label: "2m", description: "Resampled - Fast" },
        { value: "3m", label: "3m", description: "Native - Quick" },
        { value: "4m", label: "4m", description: "Resampled - Balanced" },
        { value: "5m", label: "5m", description: "Native - Standard" },
        { value: "6m", label: "6m", description: "Resampled - Smooth" },
        { value: "7m", label: "7m", description: "Resampled - Custom" },
        { value: "8m", label: "8m", description: "Resampled - Smooth" },
        { value: "9m", label: "9m", description: "Resampled - Custom" },
        { value: "10m", label: "10m", description: "Resampled - Deca-minute" },
        { value: "15m", label: "15m", description: "Native - Momentum" },
        { value: "30m", label: "30m", description: "Native - Short swing" },
        { value: "1h", label: "1h", description: "Native - Primary trend" },
        { value: "4h", label: "4h", description: "Native - Swing" },
    ]
}

/**
 * Get interval category for UI coloring
 */
export function getIntervalCategory(interval: string): "native" | "resampled" | "higher" {
    if (isBinanceNativeInterval(interval)) return "native"
    if (getIntervalSeconds(interval) < 3600) return "resampled"
    return "higher"
}