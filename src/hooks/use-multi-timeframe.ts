"use client"

import { useState, useCallback, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { config } from "@/config"
import { getTopUsdtPairs, fetchKlinesSmart, extractClosePrices } from "@/lib/binance"
import { analyzeMultiTimeframeConfluence, type ConfluenceResult } from "@/lib/analysis/multi-timeframe"
import { resolveFetchInterval } from "@/lib/binance/resample"
import { queryKeys } from "./use-binance-data"
import type { BinanceKline } from "@/types"

export interface MultiTimeframeScanResult {
    symbol: string
    interval: string
    klines: BinanceKline[]
    closePrices: number[]
}

interface MultiTimeframeProgress {
    currentPair: number
    totalPairs: number
    currentSymbol: string
    currentInterval: string
    completedIntervals: number
    totalIntervals: number
    status: "idle" | "scanning" | "complete" | "error"
    error?: string
}

interface UseMultiTimeframeReturn {
    scan: (options?: MultiTimeframeScanOptions) => Promise<ConfluenceResult[]>
    reset: () => void
    progress: MultiTimeframeProgress
    results: ConfluenceResult[]
    isScanning: boolean
    isComplete: boolean
    isError: boolean
}

interface MultiTimeframeScanOptions {
    limit?: number
    intervals?: string[]  // Now accepts custom intervals like "2m", "7m"
    totalBars?: number
    primaryPair?: string
    concurrency?: number
}

const DEFAULT_INTERVALS: string[] = ["5m", "15m", "1h"]

/**
 * Hook for multi-timeframe confluence scanning with custom interval support
 * 
 * Features:
 * - Native Binance intervals (1m, 3m, 5m, 15m, etc.) - fetched directly
 * - Custom intervals (2m, 4m, 7m, 10m, etc.) - resampled from 1m
 */
export function useMultiTimeframe(): UseMultiTimeframeReturn {
    const queryClient = useQueryClient()
    const scanLockRef = useRef(false)  // Prevent concurrent scans
    const [progress, setProgress] = useState<MultiTimeframeProgress>(({
        currentPair: 0,
        totalPairs: 0,
        currentSymbol: "",
        currentInterval: "1h",
        completedIntervals: 0,
        totalIntervals: 0,
        status: "idle",
    }))
    const [results, setResults] = useState<ConfluenceResult[]>([])

    const scan = useCallback(
        async (options: MultiTimeframeScanOptions = {}) => {
            // Prevent concurrent scans
            if (scanLockRef.current) {
                console.warn("[MTF] Scan already in progress, ignoring request")
                return []
            }
            scanLockRef.current = true

            const {
                limit = 10, // Conservative default for resampled data
                intervals = DEFAULT_INTERVALS,
                totalBars = 200,
                primaryPair = config.primaryPair,
                // concurrency = 2, // Lower concurrency for resampled (more data intensive)
            } = options

            setProgress({
                currentPair: 0,
                totalPairs: 0,
                currentSymbol: "Fetching pairs...",
                currentInterval: intervals[0],
                completedIntervals: 0,
                totalIntervals: 0,
                status: "scanning",
            })
            setResults([])

            try {
                // Clear any existing MTF cache to prevent stale data issues
                // This ensures fresh data for each scan
                const allCacheKeys = queryClient.getQueryCache().getAll()
                allCacheKeys.forEach(query => {
                    const key = query.queryKey
                    if (Array.isArray(key) && key[0] === 'klines') {
                        // Check if this is a custom interval (not native)
                        const interval = key[2] as string
                        if (interval && !['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'].includes(interval)) {
                            queryClient.removeQueries({ queryKey: key })
                        }
                    }
                })

                // Step 1: Get top pairs
                let pairs = await getTopUsdtPairs(limit)
                pairs = pairs.filter((p) => p !== primaryPair)
                const allSymbols = [primaryPair, ...pairs]

                // Calculate total intervals to fetch
                const totalIntervals = allSymbols.length * intervals.length

                setProgress({
                    currentPair: 0,
                    totalPairs: allSymbols.length,
                    currentSymbol: primaryPair,
                    currentInterval: intervals[0],
                    completedIntervals: 0,
                    totalIntervals,
                    status: "scanning",
                })

                // Step 2: Fetch data for all symbols across all intervals
                const symbolIntervalData = new Map<
                    string,
                    Map<string, number[]>
                >()

                let completedCount = 0

                for (const symbol of allSymbols) {
                    setProgress((prev) => ({
                        ...prev,
                        currentSymbol: symbol,
                        currentPair: allSymbols.indexOf(symbol) + 1,
                    }))

                    const intervalData = new Map<string, number[]>()

                    for (const interval of intervals) {
                        setProgress((prev) => ({
                            ...prev,
                            currentInterval: interval,
                        }))

                        // Check cache first
                        // Use the actual target interval as cache key, not source
                        const cached = queryClient.getQueryData<BinanceKline[]>(
                            queryKeys.klines(symbol, interval)
                        )

                        let closePrices: number[]

                        if (cached && cached.length > 0) {
                            closePrices = extractClosePrices(cached)
                        } else {
                            // Use smart fetch - handles resampling automatically
                            const klines = await fetchKlinesSmart(
                                symbol,
                                interval,
                                totalBars,
                                1000,
                                0
                            )

                            // Cache the result with TARGET interval as key
                            // This ensures 2m, 4m, 7m each have their own cache entry
                            queryClient.setQueryData(
                                queryKeys.klines(symbol, interval),
                                klines
                            )

                            closePrices = extractClosePrices(klines)
                        }

                        if (closePrices.length > 0) {
                            intervalData.set(interval, closePrices)
                        }

                        completedCount++
                        setProgress((prev) => ({
                            ...prev,
                            completedIntervals: completedCount,
                        }))

                        // Delay between requests to avoid rate limits
                        // Resampled intervals fetch more data, so we add extra delay
                        const { sourceInterval } = resolveFetchInterval(interval)
                        const isResampled = sourceInterval !== interval
                        const delay = isResampled ? config.scanDelayMs * 2 : config.scanDelayMs

                        if (completedCount < totalIntervals) {
                            await new Promise((resolve) => setTimeout(resolve, delay))
                        }
                    }

                    symbolIntervalData.set(symbol, intervalData)
                }

                // Step 3: Analyze confluence for each pair
                const primaryIntervalData = symbolIntervalData.get(primaryPair)
                if (!primaryIntervalData) {
                    throw new Error("Primary pair data not found")
                }

                const confluenceResults: ConfluenceResult[] = []

                for (const symbol of pairs) {
                    const pairIntervalData = symbolIntervalData.get(symbol)
                    if (!pairIntervalData) continue

                    // Build timeframe data map for analysis
                    const timeframeData = new Map<
                        string,
                        { primary: number[]; secondary: number[] }
                    >()

                    for (const interval of intervals) {
                        const primaryPrices = primaryIntervalData.get(interval)
                        const secondaryPrices = pairIntervalData.get(interval)

                        if (primaryPrices?.length && secondaryPrices?.length) {
                            timeframeData.set(interval, {
                                primary: primaryPrices,
                                secondary: secondaryPrices,
                            })
                        }
                    }

                    if (timeframeData.size > 0) {
                        const confluence = analyzeMultiTimeframeConfluence(
                            timeframeData,
                            symbol,
                            primaryPair,
                            { intervals }
                        )
                        confluenceResults.push(confluence)
                    }
                }

                // Sort by confluence score
                confluenceResults.sort((a, b) => b.confluenceScore - a.confluenceScore)

                setResults(confluenceResults)
                setProgress({
                    currentPair: allSymbols.length,
                    totalPairs: allSymbols.length,
                    currentSymbol: "",
                    currentInterval: intervals[intervals.length - 1],
                    completedIntervals: totalIntervals,
                    totalIntervals,
                    status: "complete",
                })

                return confluenceResults
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : "Unknown error"
                setProgress((prev) => ({
                    ...prev,
                    status: "error",
                    error: errorMessage,
                }))
                throw error
            } finally {
                // Always release the scan lock
                scanLockRef.current = false
            }
        },
        [queryClient]
    )

    const reset = useCallback(() => {
        scanLockRef.current = false  // Clear scan lock
        setProgress({
            currentPair: 0,
            totalPairs: 0,
            currentSymbol: "",
            currentInterval: "1h",
            completedIntervals: 0,
            totalIntervals: 0,
            status: "idle",
        })
        setResults([])
    }, [])

    return {
        scan,
        reset,
        progress,
        results,
        isScanning: progress.status === "scanning",
        isComplete: progress.status === "complete",
        isError: progress.status === "error",
    }
}
