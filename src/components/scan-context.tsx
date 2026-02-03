"use client"

import React, { createContext, useContext, useState, useCallback, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { config } from "@/config"
import { getTopUsdtPairs, fetchKlinesPaged, extractClosePrices } from "@/lib/binance"
import { analyzePair } from "@/lib/analysis"
import { queryKeys } from "@/hooks/use-binance-data"
import { saveSnapshot } from "@/lib/history/tracking"
import type { ScanProgress, BinanceKline, PairAnalysisResult } from "@/types"

export interface ScanResult {
    symbol: string
    klines: BinanceKline[]
    closePrices: number[]
}

interface ScanContextValue {
    progress: ScanProgress
    results: ScanResult[]
    analysisResults: PairAnalysisResult[]
    currentPrimaryPair: string
    isScanning: boolean
    isAnalyzing: boolean
    isComplete: boolean
    isError: boolean
    scan: (options?: ScanOptions) => Promise<ScanResult[]>
    analyze: () => void
    reset: () => void
    lastScanTime: Date | null
}

interface ScanOptions {
    limit?: number
    interval?: string
    totalBars?: number
    primaryPair?: string
    concurrency?: number
    includePrimary?: boolean
    autoAnalyze?: boolean
}

const ScanContext = createContext<ScanContextValue | null>(null)

export function ScanProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient()
    const [progress, setProgress] = useState<ScanProgress>({
        current: 0,
        total: 0,
        currentSymbol: "",
        status: "idle",
    })
    const [results, setResults] = useState<ScanResult[]>([])
    const [analysisResults, setAnalysisResults] = useState<PairAnalysisResult[]>([])
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [lastScanTime, setLastScanTime] = useState<Date | null>(null)
    const [currentPrimaryPair, setCurrentPrimaryPair] = useState<string>(config.primaryPair)

    // Helper function to analyze results directly
    const analyzeResults = useCallback((scanResults: ScanResult[], primaryPair: string = config.primaryPair) => {
        setIsAnalyzing(true)

        try {
            const primaryResult = scanResults.find((r) => r.symbol === primaryPair)
            if (!primaryResult || primaryResult.closePrices.length === 0) {
                console.warn("Primary pair data not found")
                setIsAnalyzing(false)
                return
            }

            const primaryCloses = primaryResult.closePrices
            const otherPairs = scanResults.filter((r) => r.symbol !== primaryPair)

            const analyzed: PairAnalysisResult[] = []
            for (const pair of otherPairs) {
                if (pair.closePrices.length > 0) {
                    const result = analyzePair(
                        primaryCloses,
                        pair.closePrices,
                        pair.symbol,
                        primaryPair
                    )
                    analyzed.push(result)
                }
            }

            analyzed.sort((a, b) => b.opportunityScore - a.opportunityScore)
            setAnalysisResults(analyzed)
        } catch (error) {
            console.error("Analysis failed:", error)
        } finally {
            setIsAnalyzing(false)
        }
    }, [])

    const scan = useCallback(
        async (options: ScanOptions = {}) => {
            const {
                limit = config.topPairsLimit,
                interval = config.interval,
                totalBars = config.totalBars,
                primaryPair = config.primaryPair,
                concurrency = 5,
                includePrimary = true,
                autoAnalyze = true,
            } = options

            setProgress({
                current: 0,
                total: 0,
                currentSymbol: "Fetching pairs...",
                status: "scanning",
            })
            setResults([])
            setAnalysisResults([])
            setCurrentPrimaryPair(primaryPair)

            try {
                // Step 1: Get top pairs
                let pairs = await getTopUsdtPairs(limit)
                pairs = pairs.filter((p) => p !== primaryPair)

                const allSymbols = includePrimary ? [primaryPair, ...pairs] : pairs

                setProgress({
                    current: 0,
                    total: allSymbols.length,
                    currentSymbol: primaryPair,
                    status: "scanning",
                })

                const scanResults: ScanResult[] = []

                // Step 2: Fetch klines with concurrency
                for (let i = 0; i < allSymbols.length; i += concurrency) {
                    const batch = allSymbols.slice(i, i + concurrency)

                    const batchPromises = batch.map(async (symbol) => {
                        const cached = queryClient.getQueryData<BinanceKline[]>(
                            queryKeys.klines(symbol, interval)
                        )

                        if (cached && cached.length > 0) {
                            return {
                                symbol,
                                klines: cached,
                                closePrices: extractClosePrices(cached),
                            }
                        }

                        const klines = await fetchKlinesPaged(symbol, interval, totalBars, 1000, 0)
                        queryClient.setQueryData(queryKeys.klines(symbol, interval), klines)

                        return {
                            symbol,
                            klines,
                            closePrices: extractClosePrices(klines),
                        }
                    })

                    const batchResults = await Promise.allSettled(batchPromises)

                    for (const result of batchResults) {
                        if (result.status === "fulfilled" && result.value.klines.length > 0) {
                            scanResults.push(result.value)
                        }
                    }

                    const completed = Math.min(i + concurrency, allSymbols.length)
                    setProgress({
                        current: completed,
                        total: allSymbols.length,
                        currentSymbol: batch[batch.length - 1] || "",
                        status: "scanning",
                    })

                    if (i + concurrency < allSymbols.length) {
                        await new Promise((resolve) => setTimeout(resolve, config.scanDelayMs))
                    }
                }

                setResults(scanResults)
                setLastScanTime(new Date())
                setProgress({
                    current: allSymbols.length,
                    total: allSymbols.length,
                    currentSymbol: "",
                    status: "complete",
                })

                // Auto-analyze if requested
                if (autoAnalyze && scanResults.length > 0) {
                    // Run analysis after a small delay to let state settle
                    setTimeout(() => {
                        analyzeResults(scanResults, primaryPair)
                        
                        // Save to history after analysis completes
                        setTimeout(() => {
                            const currentResults = scanResults.filter(r => r.symbol !== primaryPair).map(r => {
                                const primaryResult = scanResults.find(s => s.symbol === primaryPair)
                                if (!primaryResult) return null
                                return analyzePair(
                                    primaryResult.closePrices,
                                    r.closePrices,
                                    r.symbol,
                                    primaryPair
                                )
                            }).filter(Boolean) as PairAnalysisResult[]
                            
                            if (currentResults.length > 0) {
                                saveSnapshot(currentResults, primaryPair, interval)
                            }
                        }, 500)
                    }, 100)
                }

                return scanResults
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "Unknown error"
                setProgress((prev) => ({
                    ...prev,
                    status: "error",
                    error: errorMessage,
                }))
                throw error
            }
        },
        [queryClient, analyzeResults]
    )

    // Analyze all pairs using existing results
    const analyze = useCallback(() => {
        analyzeResults(results, currentPrimaryPair)
    }, [results, currentPrimaryPair, analyzeResults])

    const reset = useCallback(() => {
        setProgress({
            current: 0,
            total: 0,
            currentSymbol: "",
            status: "idle",
        })
        setResults([])
        setAnalysisResults([])
    }, [])

    const value = useMemo(
        () => ({
            progress,
            results,
            analysisResults,
            currentPrimaryPair,
            isScanning: progress.status === "scanning",
            isAnalyzing,
            isComplete: progress.status === "complete",
            isError: progress.status === "error",
            scan,
            analyze,
            reset,
            lastScanTime,
        }),
        [progress, results, analysisResults, currentPrimaryPair, isAnalyzing, scan, analyze, reset, lastScanTime]
    )

    return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>
}

export function useScan() {
    const context = useContext(ScanContext)
    if (!context) {
        throw new Error("useScan must be used within a ScanProvider")
    }
    return context
}
