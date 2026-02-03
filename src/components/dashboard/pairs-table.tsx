"use client"

import { ArrowUpDown, ExternalLink, Loader2, BarChart, Info, TrendingUp } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useScan } from "@/components/scan-context"
import { FilterControls } from "./filter-controls"
import { PairDetailModal } from "./pair-detail-modal"
import { Sparkline } from "@/components/ui/sparkline"
import { calculateSpread } from "@/lib/analysis/statistics"
import { config } from "@/config"
import { DEFAULT_FILTER_OPTIONS } from "@/types"
import type { PairAnalysisResult, SignalQuality, FilterOptions } from "@/types"
import { motion, AnimatePresence } from "framer-motion"

type SortKey =
    | "symbol"
    | "correlation"
    | "spreadZScore"
    | "opportunityScore"
    | "signalQuality"
type SortOrder = "asc" | "desc"

function getSignalBadgeClass(quality: SignalQuality) {
    switch (quality) {
        case "premium":
            return "bg-emerald-400/10 text-emerald-400 border-emerald-400/20 shadow-[0_0_12px_rgba(52,211,153,0.15)] font-semibold"
        case "strong":
            return "bg-cyan-400/10 text-cyan-400 border-cyan-400/20 font-medium"
        case "moderate":
            return "bg-amber-400/10 text-amber-400 border-amber-400/20"
        case "weak":
            return "bg-slate-400/10 text-slate-400 border-slate-400/20"
        case "noisy":
            return "bg-rose-400/10 text-rose-400 border-rose-400/20"
        default:
            return "bg-slate-500/10 text-slate-500 border-slate-500/20"
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
        case "insufficient_data":
            return "⚠️ No Data"
        default:
            return quality
    }
}

function getRegimeLabel(regime: string) {
    const labels: Record<string, string> = {
        stable_strong: "✅ Stable Strong",
        stable_weak: "⚠️ Stable Weak",
        stable: "➖ Stable",
        strengthening: "📈 Strengthening",
        recovering: "🔄 Recovering",
        weakening: "📉 Weakening",
        breaking_down: "🔻 Breaking Down",
    }
    return labels[regime] || regime
}

const signalQualityOrder: Record<SignalQuality, number> = {
    premium: 5,
    strong: 4,
    moderate: 3,
    weak: 2,
    noisy: 1,
    insufficient_data: 0,
}

export function PairsTable() {
    const { analysisResults, results, isScanning, isAnalyzing, isComplete, progress, lastScanTime, currentPrimaryPair } =
        useScan()
    const [sortKey, setSortKey] = useState<SortKey>("opportunityScore")
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
    const [selectedPair, setSelectedPair] = useState<PairAnalysisResult | null>(null)
    const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTER_OPTIONS)
    const [searchQuery, setSearchQuery] = useState("")

    // Helper: Map symbols to their price arrays for quick lookup
    const priceMap = useMemo(() => {
        const map = new Map<string, number[]>()
        results.forEach(r => map.set(r.symbol, r.closePrices))
        return map
    }, [results])

    // Filter the data
    const filteredData = useMemo(() => {
        if (!analysisResults) return []

        return analysisResults.filter((pair) => {
            // Search filter
            if (searchQuery) {
                const search = searchQuery.toLowerCase()
                if (!pair.symbol.toLowerCase().includes(search)) {
                    return false
                }
            }

            // Correlation filter
            if (Math.abs(pair.correlation) < filters.minCorrelation) {
                return false
            }

            // Z-Score filter
            if (Math.abs(pair.spreadZScore) < filters.minZScore) {
                return false
            }

            // Opportunity filter
            if (pair.opportunityScore < filters.minOpportunity) {
                return false
            }

            // Signal quality filter
            if (!filters.signalQualities.includes(pair.volatilitySpread.signalQuality)) {
                return false
            }

            // Regime filter
            if (!filters.regimes.includes(pair.correlationVelocity.regime)) {
                return false
            }

            return true
        })
    }, [analysisResults, filters, searchQuery])

    // Sort the filtered data
    const sortedData = useMemo(() => {
        return [...filteredData].sort((a, b) => {
            let aVal: number | string
            let bVal: number | string

            switch (sortKey) {
                case "symbol":
                    aVal = a.symbol
                    bVal = b.symbol
                    break
                case "correlation":
                    aVal = Math.abs(a.correlation)
                    bVal = Math.abs(b.correlation)
                    break
                case "spreadZScore":
                    aVal = Math.abs(a.spreadZScore)
                    bVal = Math.abs(b.spreadZScore)
                    break
                case "opportunityScore":
                    aVal = a.opportunityScore
                    bVal = b.opportunityScore
                    break
                case "signalQuality":
                    aVal = signalQualityOrder[a.volatilitySpread.signalQuality]
                    bVal = signalQualityOrder[b.volatilitySpread.signalQuality]
                    break
                default:
                    aVal = a.opportunityScore
                    bVal = b.opportunityScore
            }

            if (typeof aVal === "string" && typeof bVal === "string") {
                return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
            }

            return sortOrder === "asc"
                ? (aVal as number) - (bVal as number)
                : (bVal as number) - (aVal as number)
        })
    }, [filteredData, sortKey, sortOrder])

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
        } else {
            setSortKey(key)
            setSortOrder("desc")
        }
    }

    const formatLastScan = () => {
        if (!lastScanTime) return "Never"
        return lastScanTime.toLocaleTimeString()
    }

    // Stats summary
    const stats = useMemo(() => {
        if (!analysisResults || analysisResults.length === 0) {
            return { total: 0, filtered: 0, premium: 0 }
        }

        return {
            total: analysisResults.length,
            filtered: filteredData.length,
            premium: filteredData.filter((r) => r.volatilitySpread.signalQuality === "premium").length,
        }
    }, [analysisResults, filteredData])

    return (
        <>
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                Pair Analysis
                                {(isScanning || isAnalyzing) && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                            </CardTitle>
                            <CardDescription>
                                {currentPrimaryPair} vs Top USDT Pairs • Last scan: {formatLastScan()}
                                {isComplete && analysisResults.length > 0 && (
                                    <span>
                                        {" "}
                                        • Showing {stats.filtered} of {stats.total} pairs
                                        {stats.premium > 0 && (
                                            <span className="text-emerald-400 ml-1 font-medium">({stats.premium} premium)</span>
                                        )}
                                    </span>
                                )}
                            </CardDescription>
                        </div>
                    </div>

                    {/* Progress bar during scanning */}
                    {isScanning && progress.total > 0 && (
                        <div className="mt-4">
                            <div className="flex justify-between text-sm text-muted-foreground mb-1">
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Fetching {progress.currentSymbol}...
                                </span>
                                <span className="font-mono text-xs">
                                    {progress.current} / {progress.total}
                                </span>
                            </div>
                            <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                            <span className="animate-pulse">Running advanced statistical analysis...</span>
                        </div>
                    )}

                    {/* Filter controls */}
                    {analysisResults.length > 0 && (
                        <div className="mt-4">
                            <FilterControls
                                filters={filters}
                                onFiltersChange={setFilters}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                            />
                        </div>
                    )}
                </CardHeader>

                <CardContent>
                    {sortedData.length > 0 ? (
                        <div className="rounded-md border border-border/50">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="w-[140px]">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 gap-1 font-semibold"
                                                onClick={() => handleSort("symbol")}
                                            >
                                                Pair
                                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 gap-1 font-semibold"
                                                onClick={() => handleSort("correlation")}
                                            >
                                                Correlation
                                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="w-[120px]">
                                            <div className="flex items-center gap-1 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                                                <TrendingUp className="h-3 w-3" />
                                                Trend (40h)
                                            </div>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 gap-1 font-semibold"
                                                onClick={() => handleSort("spreadZScore")}
                                            >
                                                Spread Z
                                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 gap-1 font-semibold"
                                                onClick={() => handleSort("signalQuality")}
                                            >
                                                Signal
                                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="font-semibold">Regime</TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 gap-1 font-semibold"
                                                onClick={() => handleSort("opportunityScore")}
                                            >
                                                Opp. Score
                                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence mode="popLayout">
                                        {sortedData.map((pair) => {
                                            const primaryPrices = priceMap.get(currentPrimaryPair) || []
                                            const pairPrices = priceMap.get(pair.symbol) || []

                                            // Calculate recent spread for sparkline
                                            // We'll use last 40 points for visual trend
                                            let recentSpread: number[] = []
                                            if (primaryPrices.length > 0 && pairPrices.length > 0) {
                                                const len = Math.min(primaryPrices.length, pairPrices.length)
                                                // Ensure we don't exceed bounds
                                                const lookback = 40
                                                const startIndex = Math.max(0, len - lookback)
                                                if (len > 0) {
                                                    const pSlice = primaryPrices.slice(startIndex, len)
                                                    const sSlice = pairPrices.slice(startIndex, len)
                                                    recentSpread = calculateSpread(pSlice, sSlice)
                                                }
                                            }

                                            return (
                                                <motion.tr
                                                    key={pair.symbol}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 10 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="border-b transition-colors hover:bg-muted/40 cursor-pointer border-border/50 group relative"
                                                    onClick={() => setSelectedPair(pair)}
                                                >
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-foreground">{pair.symbol.replace("USDT", "")}</span>
                                                                <span className="text-[10px] text-muted-foreground">vs {currentPrimaryPair.replace("USDT", "")}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span
                                                                className={`font-mono font-medium ${Math.abs(pair.correlation) >= 0.7
                                                                    ? "text-emerald-400"
                                                                    : Math.abs(pair.correlation) >= 0.4
                                                                        ? "text-yellow-400"
                                                                        : "text-muted-foreground"
                                                                    }`}
                                                            >
                                                                {pair.correlation >= 0 ? "+" : ""}
                                                                {pair.correlation.toFixed(3)}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="w-24 h-8">
                                                            <Sparkline
                                                                data={recentSpread}
                                                                width={96}
                                                                height={32}
                                                                color={recentSpread.length > 0 && recentSpread[recentSpread.length - 1] >= recentSpread[0] ? "#34d399" : "#fb7185"}
                                                                fill={true}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span
                                                            className={`font-mono font-bold ${Math.abs(pair.spreadZScore) >= 2
                                                                ? "text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.3)]"
                                                                : Math.abs(pair.spreadZScore) >= 1
                                                                    ? "text-pink-400"
                                                                    : "text-muted-foreground"
                                                                }`}
                                                        >
                                                            {pair.spreadZScore >= 0 ? "+" : ""}
                                                            {pair.spreadZScore.toFixed(2)}σ
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={`uppercase text-[10px] tracking-wider ${getSignalBadgeClass(pair.volatilitySpread.signalQuality)}`}
                                                        >
                                                            {getSignalLabel(pair.volatilitySpread.signalQuality).split(" ")[1] || pair.volatilitySpread.signalQuality}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs text-muted-foreground">
                                                            {getRegimeLabel(pair.correlationVelocity.regime)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-16 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${pair.opportunityScore >= 70
                                                                        ? "bg-gradient-to-r from-emerald-500 to-emerald-300"
                                                                        : pair.opportunityScore >= 40
                                                                            ? "bg-yellow-500"
                                                                            : "bg-muted-foreground"
                                                                        }`}
                                                                    style={{ width: `${pair.opportunityScore}%` }}
                                                                />
                                                            </div>
                                                            <span
                                                                className={`font-mono text-sm font-bold ${pair.opportunityScore >= 70
                                                                    ? "text-emerald-400"
                                                                    : pair.opportunityScore >= 40
                                                                        ? "text-yellow-400"
                                                                        : "text-muted-foreground"
                                                                    }`}
                                                            >
                                                                {pair.opportunityScore}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                                                title="View Details"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setSelectedPair(pair)
                                                                }}
                                                            >
                                                                <Info className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-400"
                                                                title="Open in TradingView"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    window.open(
                                                                        `https://www.tradingview.com/chart/?symbol=BINANCE:${pair.symbol}`,
                                                                        "_blank"
                                                                    )
                                                                }}
                                                            >
                                                                <ExternalLink className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </motion.tr>
                                            )
                                        })}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        </div>
                    ) : analysisResults.length > 0 ? (
                        /* No results after filtering */
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="rounded-full bg-muted/30 p-4 mb-4">
                                <BarChart className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">No Matching Pairs</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                                No pairs match your current filters. Try relaxing the correlation or signal quality criteria.
                            </p>
                            <Button
                                variant="link"
                                onClick={() => setFilters(DEFAULT_FILTER_OPTIONS)}
                                className="mt-4 text-primary"
                            >
                                Clear all filters
                            </Button>
                        </div>
                    ) : (
                        /* Empty state */
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="rounded-full bg-primary/10 p-4 mb-4 ring-1 ring-primary/20">
                                <BarChart className="h-8 w-8 text-primary" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">Ready to Scan</h3>
                            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
                                Click "Scan Pairs" to analyze correlations between <span className="text-foreground font-mono">{currentPrimaryPair}</span> and the
                                top {config.topPairsLimit} USDT pairs.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detail Modal */}
            {selectedPair && (
                <PairDetailModal pair={selectedPair} onClose={() => setSelectedPair(null)} />
            )}
        </>
    )
}
