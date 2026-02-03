"use client"

import { useState, useMemo, useCallback } from "react"
import { Play, RotateCcw, TrendingUp, TrendingDown, Target, Trophy, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useScan } from "@/components/scan-context"
import { runBacktest } from "@/lib/analysis/backtest-engine"
import { config } from "@/config"
import type { BacktestConfig, BacktestResult } from "@/types/backtest-types"
import { DEFAULT_BACKTEST_CONFIG } from "@/types/backtest-types"

interface BacktestAllPanelProps {
    onPairClick?: (symbol: string) => void
}

function formatPercent(value: number, decimals: number = 2): string {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(decimals)}%`
}

interface CombinedStats {
    totalPairs: number
    profitablePairs: number
    totalTrades: number
    totalWins: number
    totalLosses: number
    combinedProfit: number
    averageWinRate: number
    bestPair: { symbol: string; profit: number } | null
    worstPair: { symbol: string; profit: number } | null
}

function calculateCombinedStats(results: BacktestResult[]): CombinedStats {
    const validResults = results.filter(r => r.trades.length > 0)

    if (validResults.length === 0) {
        return {
            totalPairs: 0,
            profitablePairs: 0,
            totalTrades: 0,
            totalWins: 0,
            totalLosses: 0,
            combinedProfit: 0,
            averageWinRate: 0,
            bestPair: null,
            worstPair: null,
        }
    }

    const totalTrades = validResults.reduce((sum, r) => sum + r.summary.totalTrades, 0)
    const totalWins = validResults.reduce((sum, r) => sum + r.summary.winningTrades, 0)
    const totalLosses = validResults.reduce((sum, r) => sum + r.summary.losingTrades, 0)
    const combinedProfit = validResults.reduce((sum, r) => sum + r.summary.totalProfitPercent, 0)
    const profitablePairs = validResults.filter(r => r.summary.totalProfitPercent > 0).length

    // Find best and worst pairs
    const sorted = [...validResults].sort((a, b) => b.summary.totalProfitPercent - a.summary.totalProfitPercent)
    const bestPair = sorted[0] ? { symbol: sorted[0].symbol, profit: sorted[0].summary.totalProfitPercent } : null
    const worstPair = sorted[sorted.length - 1] ? { symbol: sorted[sorted.length - 1].symbol, profit: sorted[sorted.length - 1].summary.totalProfitPercent } : null

    return {
        totalPairs: validResults.length,
        profitablePairs,
        totalTrades,
        totalWins,
        totalLosses,
        combinedProfit,
        averageWinRate: totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0,
        bestPair,
        worstPair,
    }
}

export function BacktestAllPanel({ onPairClick }: BacktestAllPanelProps) {
    const { results, analysisResults } = useScan()
    const [btConfig, setBtConfig] = useState<BacktestConfig>(DEFAULT_BACKTEST_CONFIG)
    const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([])
    const [isRunning, setIsRunning] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })

    // Get primary pair closes
    const primaryCloses = useMemo(() => {
        const primary = results.find(r => r.symbol === config.primaryPair)
        return primary?.closePrices || []
    }, [results])

    // Get pairs that meet correlation threshold
    const eligiblePairs = useMemo(() => {
        return analysisResults.filter(r =>
            r.symbol !== config.primaryPair &&
            r.correlation >= btConfig.minCorrelation
        )
    }, [analysisResults, btConfig.minCorrelation])

    const handleRunAll = useCallback(async () => {
        if (primaryCloses.length === 0) return

        setIsRunning(true)
        setBacktestResults([])
        setProgress({ current: 0, total: eligiblePairs.length })

        const allResults: BacktestResult[] = []

        for (let i = 0; i < eligiblePairs.length; i++) {
            const pair = eligiblePairs[i]
            const pairData = results.find(r => r.symbol === pair.symbol)

            if (pairData) {
                const result = runBacktest(
                    primaryCloses,
                    pairData.closePrices,
                    pair.symbol,
                    config.primaryPair,
                    btConfig
                )
                allResults.push(result)
            }

            setProgress({ current: i + 1, total: eligiblePairs.length })

            // Small delay to allow UI updates
            if (i % 10 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0))
            }
        }

        setBacktestResults(allResults)
        setIsRunning(false)
    }, [primaryCloses, eligiblePairs, results, btConfig])

    const handleReset = () => {
        setBacktestResults([])
        setProgress({ current: 0, total: 0 })
    }

    const setConfig = (partial: Partial<BacktestConfig>) => {
        setBtConfig(prev => ({ ...prev, ...partial }))
    }

    // Calculate combined stats
    const combinedStats = useMemo(() => calculateCombinedStats(backtestResults), [backtestResults])

    // Sort results by profit
    const sortedResults = useMemo(() => {
        return [...backtestResults]
            .filter(r => r.trades.length > 0)
            .sort((a, b) => b.summary.totalProfitPercent - a.summary.totalProfitPercent)
    }, [backtestResults])

    return (
        <Card className="mb-6">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            📊 Backtest All Pairs
                            {eligiblePairs.length > 0 && (
                                <Badge variant="outline" className="font-normal">
                                    {eligiblePairs.length} eligible pairs
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Run backtest on all pairs meeting correlation threshold
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            disabled={isRunning}
                        >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reset
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleRunAll}
                            disabled={isRunning || eligiblePairs.length === 0}
                            className="bg-gradient-to-r from-purple-500 to-pink-500"
                        >
                            <Play className="h-4 w-4 mr-1" />
                            {isRunning ? `Running ${progress.current}/${progress.total}...` : "Run All"}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Configuration */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">
                            Entry Spread (|Z|)
                        </label>
                        <input
                            type="number"
                            step="0.5"
                            min="1"
                            max="5"
                            value={btConfig.entrySpreadThreshold}
                            onChange={(e) => setConfig({ entrySpreadThreshold: Math.abs(parseFloat(e.target.value)) || 3 })}
                            className="w-full px-2 py-1 rounded bg-background border text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">
                            Min Correlation
                        </label>
                        <input
                            type="number"
                            step="0.05"
                            min="0.5"
                            max="0.95"
                            value={btConfig.minCorrelation}
                            onChange={(e) => setConfig({ minCorrelation: parseFloat(e.target.value) || 0.7 })}
                            className="w-full px-2 py-1 rounded bg-background border text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">
                            Take Profit (%)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="5"
                            value={btConfig.takeProfitPercent}
                            onChange={(e) => setConfig({ takeProfitPercent: parseFloat(e.target.value) || 0.5 })}
                            className="w-full px-2 py-1 rounded bg-background border text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground block mb-1">
                            Stop Loss (%)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="5"
                            value={btConfig.stopLossPercent}
                            onChange={(e) => setConfig({ stopLossPercent: parseFloat(e.target.value) || 0.5 })}
                            className="w-full px-2 py-1 rounded bg-background border text-sm"
                        />
                    </div>
                </div>

                {/* Combined Summary */}
                {sortedResults.length > 0 && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                        <Target className="h-3 w-3" />
                                        Combined Profit
                                    </div>
                                    <div className={`text-xl font-bold ${combinedStats.combinedProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                        {formatPercent(combinedStats.combinedProfit)}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                        <TrendingUp className="h-3 w-3" />
                                        Total Win Rate
                                    </div>
                                    <div className={`text-xl font-bold ${combinedStats.averageWinRate >= 50 ? "text-emerald-500" : "text-yellow-500"}`}>
                                        {combinedStats.averageWinRate.toFixed(1)}%
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                        <Trophy className="h-3 w-3" />
                                        Profitable Pairs
                                    </div>
                                    <div className="text-xl font-bold">
                                        {combinedStats.profitablePairs}/{combinedStats.totalPairs}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                        <TrendingUp className="h-3 w-3" />
                                        Best Pair
                                    </div>
                                    <div className="text-sm font-bold text-emerald-400">
                                        {combinedStats.bestPair?.symbol.replace("USDT", "")}
                                        <span className="ml-1 text-xs">
                                            {combinedStats.bestPair && formatPercent(combinedStats.bestPair.profit)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                        <TrendingDown className="h-3 w-3" />
                                        Worst Pair
                                    </div>
                                    <div className="text-sm font-bold text-red-400">
                                        {combinedStats.worstPair?.symbol.replace("USDT", "")}
                                        <span className="ml-1 text-xs">
                                            {combinedStats.worstPair && formatPercent(combinedStats.worstPair.profit)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Additional Stats Row */}
                        <div className="grid grid-cols-4 gap-4 text-sm p-3 bg-muted/30 rounded-lg">
                            <div>
                                <span className="text-muted-foreground">Total Trades:</span>
                                <span className="ml-2 font-mono">{combinedStats.totalTrades}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Wins:</span>
                                <span className="ml-2 font-mono text-emerald-400">{combinedStats.totalWins}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Losses:</span>
                                <span className="ml-2 font-mono text-red-400">{combinedStats.totalLosses}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Avg Per Pair:</span>
                                <span className={`ml-2 font-mono ${combinedStats.combinedProfit / combinedStats.totalPairs >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {formatPercent(combinedStats.combinedProfit / combinedStats.totalPairs)}
                                </span>
                            </div>
                        </div>

                        {/* Results Table */}
                        <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-card">
                                    <tr className="text-muted-foreground text-xs border-b">
                                        <th className="text-left py-2 px-2">#</th>
                                        <th className="text-left py-2 px-2">Pair</th>
                                        <th className="text-right py-2 px-2">Trades</th>
                                        <th className="text-right py-2 px-2">W/L</th>
                                        <th className="text-right py-2 px-2">Win Rate</th>
                                        <th className="text-right py-2 px-2">Profit</th>
                                        <th className="text-right py-2 px-2">Max DD</th>
                                        <th className="text-right py-2 px-2">PF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedResults.map((result, idx) => (
                                        <tr
                                            key={result.symbol}
                                            className="border-b border-muted/30 hover:bg-muted/20 cursor-pointer"
                                            onClick={() => onPairClick?.(result.symbol)}
                                        >
                                            <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                                            <td className="py-2 px-2 font-medium">
                                                {result.symbol.replace("USDT", "")}
                                                <span className="text-muted-foreground text-xs ml-1">vs {config.primaryPair.replace("USDT", "")}</span>
                                            </td>
                                            <td className="py-2 px-2 text-right font-mono">{result.summary.totalTrades}</td>
                                            <td className="py-2 px-2 text-right">
                                                <span className="text-emerald-400">{result.summary.winningTrades}</span>
                                                <span className="text-muted-foreground">/</span>
                                                <span className="text-red-400">{result.summary.losingTrades}</span>
                                            </td>
                                            <td className={`py-2 px-2 text-right font-mono ${result.summary.winRate >= 50 ? "text-emerald-400" : "text-yellow-400"}`}>
                                                {result.summary.winRate.toFixed(1)}%
                                            </td>
                                            <td className={`py-2 px-2 text-right font-mono font-bold ${result.summary.totalProfitPercent >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                                {formatPercent(result.summary.totalProfitPercent)}
                                            </td>
                                            <td className="py-2 px-2 text-right font-mono text-red-400">
                                                {formatPercent(-Math.abs(result.summary.maxDrawdownPercent))}
                                            </td>
                                            <td className="py-2 px-2 text-right font-mono">
                                                {result.summary.profitFactor === Infinity ? "∞" : result.summary.profitFactor.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* No eligible pairs */}
                {eligiblePairs.length === 0 && analysisResults.length > 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                        <p>No pairs meet the correlation threshold ({btConfig.minCorrelation}).</p>
                        <p className="text-sm mt-2">Try lowering the min correlation requirement.</p>
                    </div>
                )}

                {/* Initial state */}
                {analysisResults.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>Scan pairs first, then run backtest on all eligible pairs.</p>
                    </div>
                )}

                {/* After running but no results with trades */}
                {backtestResults.length > 0 && sortedResults.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No trades found for any pair with current parameters.</p>
                        <p className="text-sm mt-2">Try lowering the entry spread threshold.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
