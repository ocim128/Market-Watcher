"use client"

import { ArrowUpDown, ExternalLink, Loader2, BarChart, Info } from "lucide-react"
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
import { config } from "@/config"
import { DEFAULT_FILTER_OPTIONS } from "@/types"
import type { PairAnalysisResult, SignalQuality, FilterOptions } from "@/types"

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
    const { analysisResults, isScanning, isAnalyzing, isComplete, progress, lastScanTime, currentPrimaryPair } =
        useScan()
    const [sortKey, setSortKey] = useState<SortKey>("opportunityScore")
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
    const [selectedPair, setSelectedPair] = useState<PairAnalysisResult | null>(null)
    const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTER_OPTIONS)
    const [searchQuery, setSearchQuery] = useState("")

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
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                Pair Analysis
                                {(isScanning || isAnalyzing) && <Loader2 className="h-4 w-4 animate-spin" />}
                            </CardTitle>
                            <CardDescription>
                                {currentPrimaryPair} vs Top USDT Pairs • Last scan: {formatLastScan()}
                                {isComplete && analysisResults.length > 0 && (
                                    <span>
                                        {" "}
                                        • Showing {stats.filtered} of {stats.total} pairs
                                        {stats.premium > 0 && (
                                            <span className="text-purple-400 ml-1">({stats.premium} premium)</span>
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
                                <span>Fetching {progress.currentSymbol}...</span>
                                <span>
                                    {progress.current} / {progress.total}
                                </span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div className="mt-4 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                            Running statistical analysis...
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
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[130px]">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 gap-1"
                                                onClick={() => handleSort("symbol")}
                                            >
                                                Pair
                                                <ArrowUpDown className="h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 gap-1"
                                                onClick={() => handleSort("correlation")}
                                            >
                                                Correlation
                                                <ArrowUpDown className="h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 gap-1"
                                                onClick={() => handleSort("spreadZScore")}
                                            >
                                                Spread Z
                                                <ArrowUpDown className="h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 gap-1"
                                                onClick={() => handleSort("signalQuality")}
                                            >
                                                Signal
                                                <ArrowUpDown className="h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead>Regime</TableHead>
                                        <TableHead>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 gap-1"
                                                onClick={() => handleSort("opportunityScore")}
                                            >
                                                Opportunity
                                                <ArrowUpDown className="h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="w-[80px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedData.map((pair) => (
                                        <TableRow
                                            key={pair.symbol}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => setSelectedPair(pair)}
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono">{pair.symbol.replace("USDT", "")}</span>
                                                    <span className="text-xs text-muted-foreground">vs {currentPrimaryPair.replace("USDT", "")}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={
                                                        Math.abs(pair.correlation) >= 0.7
                                                            ? "text-emerald-500 font-medium"
                                                            : Math.abs(pair.correlation) >= 0.4
                                                                ? "text-yellow-500"
                                                                : "text-muted-foreground"
                                                    }
                                                >
                                                    {pair.correlation >= 0 ? "+" : ""}
                                                    {pair.correlation.toFixed(3)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span
                                                    className={
                                                        Math.abs(pair.spreadZScore) >= 2
                                                            ? "text-purple-400 font-bold"
                                                            : Math.abs(pair.spreadZScore) >= 1
                                                                ? "text-pink-400"
                                                                : "text-muted-foreground"
                                                    }
                                                >
                                                    {pair.spreadZScore >= 0 ? "+" : ""}
                                                    {pair.spreadZScore.toFixed(2)}σ
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={getSignalBadgeClass(pair.volatilitySpread.signalQuality)}
                                                >
                                                    {getSignalLabel(pair.volatilitySpread.signalQuality)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">
                                                    {getRegimeLabel(pair.correlationVelocity.regime)}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 bg-secondary rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${pair.opportunityScore >= 70
                                                                ? "bg-emerald-500"
                                                                : pair.opportunityScore >= 40
                                                                    ? "bg-yellow-500"
                                                                    : "bg-muted-foreground"
                                                                }`}
                                                            style={{ width: `${pair.opportunityScore}%` }}
                                                        />
                                                    </div>
                                                    <span
                                                        className={`font-mono text-sm ${pair.opportunityScore >= 70
                                                            ? "text-emerald-500"
                                                            : pair.opportunityScore >= 40
                                                                ? "text-yellow-500"
                                                                : "text-muted-foreground"
                                                            }`}
                                                    >
                                                        {pair.opportunityScore}%
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
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
                                                        className="h-8 w-8"
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
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : analysisResults.length > 0 ? (
                        /* No results after filtering */
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="rounded-full bg-muted p-3 mb-4">
                                <BarChart className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-1">No Matching Pairs</h3>
                            <p className="text-muted-foreground text-sm max-w-sm">
                                No pairs match your current filters. Try adjusting the filter criteria.
                            </p>
                        </div>
                    ) : (
                        /* Empty state */
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="rounded-full bg-muted p-3 mb-4">
                                <BarChart className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-1">Ready to Scan</h3>
                            <p className="text-muted-foreground text-sm max-w-sm">
                                Click "Scan Pairs" to analyze correlations between {currentPrimaryPair} and the
                                top {config.topPairsLimit} USDT pairs on Binance.
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
