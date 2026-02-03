"use client"

import { X, ExternalLink, TrendingUp, BarChart3, Activity, Zap } from "lucide-react"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SpreadChart } from "@/components/charts/spread-chart"
import { PriceComparisonChart } from "@/components/charts/price-comparison-chart"
import { BacktestPanel } from "@/components/dashboard/backtest-panel"
import { useScan } from "@/components/scan-context"
import { calculateSpread, pearsonCorrelation, calculateReturns } from "@/lib/analysis"
import { config } from "@/config"
import type { PairAnalysisResult, SignalQuality } from "@/types"

interface PairDetailModalProps {
    pair: PairAnalysisResult
    onClose: () => void
}

function getSignalBadgeClass(quality: SignalQuality) {
    switch (quality) {
        case "premium":
            return "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
        case "strong":
            return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
        case "moderate":
            return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
        case "weak":
            return "bg-gray-500/20 text-gray-400 border-gray-500/30"
        case "noisy":
            return "bg-red-500/20 text-red-400 border-red-500/30"
        default:
            return "bg-gray-500/20 text-gray-400"
    }
}

function getSignalLabel(quality: SignalQuality) {
    switch (quality) {
        case "premium":
            return "💎 Premium"
        case "strong":
            return "💪 Strong"
        case "moderate":
            return "📊 Moderate"
        case "weak":
            return "📉 Weak"
        case "noisy":
            return "🔊 Noisy"
        default:
            return quality
    }
}

export function PairDetailModal({ pair, onClose }: PairDetailModalProps) {
    const { results, currentPrimaryPair } = useScan()

    // Get price data for charts
    const chartData = useMemo(() => {
        const primaryResult = results.find((r) => r.symbol === currentPrimaryPair)
        const secondaryResult = results.find((r) => r.symbol === pair.symbol)

        if (!primaryResult || !secondaryResult) {
            return null
        }

        const primaryCloses = primaryResult.closePrices
        const secondaryCloses = secondaryResult.closePrices
        const timestamps = primaryResult.klines.map((k) => k.openTime)

        // Align lengths
        const length = Math.min(primaryCloses.length, secondaryCloses.length)
        const alignedPrimary = primaryCloses.slice(-length)
        const alignedSecondary = secondaryCloses.slice(-length)
        const alignedTimestamps = timestamps.slice(-length)

        // Calculate spread
        const spread = calculateSpread(alignedPrimary, alignedSecondary)

        // Calculate rolling correlation
        const windowSize = 50
        const rollingCorrelations: number[] = []
        const returnsPrimary = calculateReturns(alignedPrimary)
        const returnsSecondary = calculateReturns(alignedSecondary)

        for (let i = windowSize; i <= returnsPrimary.length; i++) {
            const windowPrimary = returnsPrimary.slice(i - windowSize, i)
            const windowSecondary = returnsSecondary.slice(i - windowSize, i)
            rollingCorrelations.push(pearsonCorrelation(windowPrimary, windowSecondary))
        }

        return {
            primaryCloses: alignedPrimary,
            secondaryCloses: alignedSecondary,
            timestamps: alignedTimestamps,
            spread,
            rollingCorrelations,
        }
    }, [results, pair.symbol, currentPrimaryPair])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div
                className="bg-card border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold">
                            {pair.symbol.replace("USDT", "")}/USDT
                            <span className="text-muted-foreground font-normal ml-2">vs {currentPrimaryPair}</span>
                        </h2>
                        <Badge
                            variant="outline"
                            className={getSignalBadgeClass(pair.volatilitySpread.signalQuality)}
                        >
                            {getSignalLabel(pair.volatilitySpread.signalQuality)}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() =>
                                window.open(
                                    `https://www.tradingview.com/chart/?symbol=BINANCE:${pair.symbol}`,
                                    "_blank"
                                )
                            }
                        >
                            TradingView
                            <ExternalLink className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="p-4 space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    Correlation
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className={`text-2xl font-bold ${Math.abs(pair.correlation) >= 0.7
                                        ? "text-emerald-500"
                                        : Math.abs(pair.correlation) >= 0.4
                                            ? "text-yellow-500"
                                            : "text-muted-foreground"
                                        }`}
                                >
                                    {pair.correlation >= 0 ? "+" : ""}
                                    {pair.correlation.toFixed(3)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <BarChart3 className="h-3 w-3" />
                                    Spread Z-Score
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className={`text-2xl font-bold ${Math.abs(pair.spreadZScore) >= 2
                                        ? "text-purple-400"
                                        : Math.abs(pair.spreadZScore) >= 1
                                            ? "text-pink-400"
                                            : "text-muted-foreground"
                                        }`}
                                >
                                    {pair.spreadZScore >= 0 ? "+" : ""}
                                    {pair.spreadZScore.toFixed(2)}σ
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    Volatility
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {(pair.volatilitySpread.combinedVolatility * 100).toFixed(2)}%
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    Opportunity
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className={`text-2xl font-bold ${pair.opportunityScore >= 70
                                        ? "text-emerald-500"
                                        : pair.opportunityScore >= 40
                                            ? "text-yellow-500"
                                            : "text-muted-foreground"
                                        }`}
                                >
                                    {pair.opportunityScore}%
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Charts */}
                    {chartData && (
                        <>
                            {/* Price Comparison */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Price Comparison (% Change)</CardTitle>
                                    <CardDescription>
                                        Normalized price movement from start of analysis period
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <PriceComparisonChart
                                        primaryPrices={chartData.primaryCloses}
                                        secondaryPrices={chartData.secondaryCloses}
                                        primaryLabel={currentPrimaryPair.replace("USDT", "")}
                                        secondaryLabel={pair.symbol.replace("USDT", "")}
                                        timestamps={chartData.timestamps}
                                        height={200}
                                    />
                                </CardContent>
                            </Card>

                            {/* Spread Chart */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">Log Spread</CardTitle>
                                    <CardDescription>
                                        Spread = log(primary) - log(secondary) with ±2σ bands
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <SpreadChart
                                        spread={chartData.spread}
                                        mean={pair.spreadMean}
                                        std={pair.spreadStd}
                                        timestamps={chartData.timestamps}
                                        height={200}
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* Analysis Notes */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Analysis Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {pair.notes.map((note, idx) => (
                                    <li key={idx} className="text-sm text-muted-foreground">
                                        {note}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Backtest Panel */}
                    <BacktestPanel symbol={pair.symbol} />

                    {/* Detailed Metrics */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Detailed Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Raw Z-Score:</span>
                                    <span className="ml-2 font-mono">
                                        {pair.volatilitySpread.rawZScore.toFixed(3)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Adjusted Z-Score:</span>
                                    <span className="ml-2 font-mono">
                                        {pair.volatilitySpread.adjustedZScore.toFixed(3)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Signal Strength:</span>
                                    <span className="ml-2 font-mono">
                                        {pair.volatilitySpread.signalStrength.toFixed(1)}%
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Primary Vol:</span>
                                    <span className="ml-2 font-mono">
                                        {(pair.volatilitySpread.primaryVolatility * 100).toFixed(2)}%
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Secondary Vol:</span>
                                    <span className="ml-2 font-mono">
                                        {(pair.volatilitySpread.secondaryVolatility * 100).toFixed(2)}%
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Corr Velocity:</span>
                                    <span className="ml-2 font-mono">
                                        {pair.correlationVelocity.velocity.toFixed(5)}/bar
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Spread Mean:</span>
                                    <span className="ml-2 font-mono">{pair.spreadMean.toFixed(6)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Spread Std:</span>
                                    <span className="ml-2 font-mono">{pair.spreadStd.toFixed(6)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Price Ratio:</span>
                                    <span className="ml-2 font-mono">{pair.ratio.toFixed(6)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Aligned Bars:</span>
                                    <span className="ml-2 font-mono">{pair.alignedBars}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Regime:</span>
                                    <span className="ml-2">{pair.correlationVelocity.regime.replace(/_/g, " ")}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
