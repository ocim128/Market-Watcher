"use client"

import { useMemo } from "react"
import { Play, RotateCcw, TrendingUp, TrendingDown, Target, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useScan } from "@/components/scan-context"
import { useBacktest } from "@/hooks/use-backtest"
import type { Trade } from "@/types/backtest-types"

interface BacktestPanelProps {
    symbol: string
}

function formatPercent(value: number, decimals: number = 2): string {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(decimals)}%`
}

function getTradeColor(trade: Trade): string {
    if (trade.exitReason === "take_profit") return "text-emerald-500"
    if (trade.exitReason === "stop_loss") return "text-red-500"
    return "text-yellow-500"
}

function getExitBadge(exitReason: Trade["exitReason"]) {
    switch (exitReason) {
        case "take_profit":
            return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">TP</Badge>
        case "stop_loss":
            return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">SL</Badge>
        case "end_of_data":
            return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">EOD</Badge>
    }
}

export function BacktestPanel({ symbol }: BacktestPanelProps) {
    const { results, currentPrimaryPair } = useScan()
    const { config: btConfig, setConfig, result, isRunning, run, reset } = useBacktest()

    // Get price data
    const priceData = useMemo(() => {
        const primaryResult = results.find((r) => r.symbol === currentPrimaryPair)
        const secondaryResult = results.find((r) => r.symbol === symbol)

        if (!primaryResult || !secondaryResult) return null

        return {
            primaryCloses: primaryResult.closePrices,
            secondaryCloses: secondaryResult.closePrices,
        }
    }, [results, symbol, currentPrimaryPair])

    const handleRun = () => {
        if (!priceData) return
        run(priceData.primaryCloses, priceData.secondaryCloses, symbol, currentPrimaryPair)
    }

    return (
        <Card className="mt-4">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">📊 Backtest</CardTitle>
                        <CardDescription>
                            Simulate trading performance with configurable parameters
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={reset}
                            disabled={isRunning}
                        >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reset
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleRun}
                            disabled={isRunning || !priceData}
                            className="bg-gradient-to-r from-purple-500 to-pink-500"
                        >
                            <Play className="h-4 w-4 mr-1" />
                            {isRunning ? "Running..." : "Run Backtest"}
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

                {/* Results Summary */}
                {result && result.trades.length > 0 && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                        <Target className="h-3 w-3" />
                                        Total Profit
                                    </div>
                                    <div className={`text-xl font-bold ${result.summary.totalProfitPercent >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                                        {formatPercent(result.summary.totalProfitPercent)}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                        <TrendingUp className="h-3 w-3" />
                                        Win Rate
                                    </div>
                                    <div className={`text-xl font-bold ${result.summary.winRate >= 50 ? "text-emerald-500" : "text-yellow-500"}`}>
                                        {result.summary.winRate.toFixed(1)}%
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                        <TrendingDown className="h-3 w-3" />
                                        Max Drawdown
                                    </div>
                                    <div className="text-xl font-bold text-red-500">
                                        {formatPercent(-Math.abs(result.summary.maxDrawdownPercent))}
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                                        <Timer className="h-3 w-3" />
                                        Total Trades
                                    </div>
                                    <div className="text-xl font-bold">
                                        {result.summary.totalTrades}
                                        <span className="text-xs text-muted-foreground ml-1">
                                            ({result.summary.winningTrades}W / {result.summary.losingTrades}L)
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Additional Stats */}
                        <div className="grid grid-cols-4 gap-4 text-sm p-3 bg-muted/30 rounded-lg">
                            <div>
                                <span className="text-muted-foreground">Profit Factor:</span>
                                <span className="ml-2 font-mono">
                                    {result.summary.profitFactor === Infinity ? "∞" : result.summary.profitFactor.toFixed(2)}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Avg Trade:</span>
                                <span className={`ml-2 font-mono ${result.summary.averageProfitPercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {formatPercent(result.summary.averageProfitPercent)}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Best Trade:</span>
                                <span className="ml-2 font-mono text-emerald-400">
                                    {formatPercent(result.summary.largestWin)}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Worst Trade:</span>
                                <span className="ml-2 font-mono text-red-400">
                                    {formatPercent(result.summary.largestLoss)}
                                </span>
                            </div>
                        </div>

                        {/* Trades Table */}
                        <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-card">
                                    <tr className="text-muted-foreground text-xs border-b">
                                        <th className="text-left py-2 px-2">#</th>
                                        <th className="text-left py-2 px-2">Direction</th>
                                        <th className="text-right py-2 px-2">Entry Z</th>
                                        <th className="text-right py-2 px-2">Exit Z</th>
                                        <th className="text-right py-2 px-2">P&L</th>
                                        <th className="text-center py-2 px-2">Exit</th>
                                        <th className="text-right py-2 px-2">Bars</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.trades.map((trade, idx) => (
                                        <tr key={idx} className="border-b border-muted/30 hover:bg-muted/20">
                                            <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
                                            <td className="py-2 px-2">
                                                {trade.direction === "long_primary" ? (
                                                    <div className="flex flex-col text-xs">
                                                        <span className="text-emerald-400">LONG {currentPrimaryPair.replace("USDT", "")}</span>
                                                        <span className="text-red-400">SHORT {symbol.replace("USDT", "")}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col text-xs">
                                                        <span className="text-red-400">SHORT {currentPrimaryPair.replace("USDT", "")}</span>
                                                        <span className="text-emerald-400">LONG {symbol.replace("USDT", "")}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-2 px-2 text-right font-mono">
                                                {trade.entrySpread >= 0 ? "+" : ""}{trade.entrySpread.toFixed(2)}σ
                                            </td>
                                            <td className="py-2 px-2 text-right font-mono">
                                                {trade.exitSpread >= 0 ? "+" : ""}{trade.exitSpread.toFixed(2)}σ
                                            </td>
                                            <td className={`py-2 px-2 text-right font-mono ${getTradeColor(trade)}`}>
                                                {formatPercent(trade.profitPercent)}
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                {getExitBadge(trade.exitReason)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-muted-foreground">
                                                {trade.durationBars}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* No results state */}
                {result && result.trades.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No trades found with current parameters.</p>
                        <p className="text-sm mt-2">Try lowering the entry spread threshold or correlation requirement.</p>
                    </div>
                )}

                {/* Initial state */}
                {!result && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>Configure parameters and click &quot;Run Backtest&quot; to simulate trading.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
