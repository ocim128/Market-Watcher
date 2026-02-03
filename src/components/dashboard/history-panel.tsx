"use client"

import { useState, useEffect } from "react"
import { History, Download, Trash2, TrendingUp, TrendingDown, Minus, Activity, BarChart3, Clock } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useHistory } from "@/hooks/use-history"
import { cn } from "@/lib/utils"
import type { OpportunityTrend, PairHistoricalData } from "@/lib/history/tracking"

interface TrendBadgeProps {
    trend: OpportunityTrend["trend"]
    changePercent?: number
}

function TrendBadge({ trend, changePercent }: TrendBadgeProps) {
    const icons = {
        improving: TrendingUp,
        declining: TrendingDown,
        stable: Minus,
        volatile: Activity,
    }
    
    const colors = {
        improving: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        declining: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        stable: "bg-slate-500/10 text-slate-400 border-slate-500/20",
        volatile: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    }
    
    const Icon = icons[trend]
    
    return (
        <Badge variant="outline" className={cn("gap-1", colors[trend])}>
            <Icon className="h-3 w-3" />
            <span className="capitalize">{trend}</span>
            {changePercent !== undefined && changePercent !== 0 && (
                <span className="ml-1 text-[10px]">
                    ({changePercent > 0 ? "+" : ""}{changePercent}%)
                </span>
            )}
        </Badge>
    )
}

interface PairHistoryCardProps {
    data: PairHistoricalData
}

function _PairHistoryCard({ data }: PairHistoryCardProps) {
    const qualityEntries = Object.entries(data.signalQualityDistribution)
        .sort((a, b) => b[1] - a[1])
    
    return (
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                        {data.symbol.replace("USDT", "")}
                        <span className="text-muted-foreground text-xs ml-2">vs {data.primarySymbol.replace("USDT", "")}</span>
                    </CardTitle>
                    <TrendBadge trend={data.opportunityTrend} />
                </div>
                <CardDescription>
                    Tracked {data.totalOccurrences} times since {new Date(data.firstSeen).toLocaleDateString()}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Score stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                        <div className="text-xs text-muted-foreground mb-1">Average</div>
                        <div className="text-xl font-bold text-foreground">{data.avgOpportunityScore}</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                        <div className="text-xs text-muted-foreground mb-1">Best</div>
                        <div className="text-xl font-bold text-emerald-400">{data.maxOpportunityScore}</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                        <div className="text-xs text-muted-foreground mb-1">Avg Z-Score</div>
                        <div className="text-xl font-bold text-purple-400">{data.avgZScore.toFixed(2)}</div>
                    </div>
                </div>
                
                {/* Quality distribution */}
                {qualityEntries.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Signal Quality Distribution</div>
                        <div className="flex flex-wrap gap-2">
                            {qualityEntries.map(([quality, count]) => (
                                <Badge
                                    key={quality}
                                    variant="outline"
                                    className={cn(
                                        "text-[10px] capitalize",
                                        quality === "premium" && "bg-emerald-500/10 text-emerald-400",
                                        quality === "strong" && "bg-cyan-500/10 text-cyan-400",
                                        quality === "moderate" && "bg-amber-500/10 text-amber-400",
                                        quality === "weak" && "bg-slate-500/10 text-slate-400",
                                        quality === "noisy" && "bg-rose-500/10 text-rose-400",
                                    )}
                                >
                                    {quality}: {count}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Recent activity sparkline */}
                {data.recentSignals.length > 1 && (
                    <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Recent Activity (Last 20)</div>
                        <div className="flex items-end gap-0.5 h-12">
                            {data.recentSignals.map((signal, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        "flex-1 rounded-t-sm min-w-[4px]",
                                        signal.opportunityScore >= 70 ? "bg-emerald-400" :
                                        signal.opportunityScore >= 40 ? "bg-amber-400" : "bg-slate-400"
                                    )}
                                    style={{ height: `${Math.max(10, signal.opportunityScore)}%` }}
                                    title={`Score: ${signal.opportunityScore} | Z: ${signal.zScore.toFixed(2)}`}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export function HistoryPanel() {
    const {
        history,
        getSummary,
        getStats,
        getTrends,
        getBestOpportunities,
        downloadCSV,
        clearAllHistory,
    } = useHistory()

    const [summary, setSummary] = useState<ReturnType<typeof getSummary> | null>(null)
    const [stats, setStats] = useState<ReturnType<typeof getStats> | null>(null)
    const [trends, setTrends] = useState<OpportunityTrend[]>([])
    const [bestOpps, setBestOpps] = useState<ReturnType<typeof getBestOpportunities>>([])
    const [selectedPair, setSelectedPair] = useState<string | null>(null)
    // TODO: Implement pair history detail view
    // const [pairHistory, setPairHistory] = useState<PairHistoricalData | null>(null)

    useEffect(() => {
        setSummary(getSummary())
        setStats(getStats())
        setTrends(getTrends().slice(0, 10))
        setBestOpps(getBestOpportunities(10))
    }, [history, getSummary, getStats, getTrends, getBestOpportunities])

    useEffect(() => {
        if (selectedPair) {
            // This would need a method to get pair history - we'll use getHistoryForPair
            // For now, we'll skip this part
        }
    }, [selectedPair])

    if (history.length === 0) {
        return (
            <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <History className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Historical Tracking</CardTitle>
                            <CardDescription>Track opportunities over time</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 bg-blue-500/10 rounded-full border border-blue-500/20 mb-4">
                            <Clock className="h-8 w-8 text-blue-400" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">No History Yet</h3>
                        <p className="text-muted-foreground text-sm max-w-md">
                            Complete scans will be automatically saved to track opportunity trends over time.
                            Check back after running a few scans!
                        </p>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                            <History className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Historical Tracking</CardTitle>
                            <CardDescription>
                                {stats?.totalSnapshots} snapshots across {stats?.dateRange.start ? new Date(stats.dateRange.start).toLocaleDateString() : "N/A"} - {stats?.dateRange.end ? new Date(stats.dateRange.end).toLocaleDateString() : "N/A"}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadCSV}
                            className="gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={clearAllHistory}
                            className="gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                            <Trash2 className="h-4 w-4" />
                            Clear
                        </Button>
                    </div>
                </div>

                {/* Summary stats */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Today&apos;s Scans</div>
                            <div className="text-2xl font-bold">{summary.snapshotsToday}</div>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Pairs Tracked</div>
                            <div className="text-2xl font-bold">{summary.uniquePairsTracked}</div>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Best Today</div>
                            <div className="text-lg font-bold text-emerald-400">
                                {summary.bestOpportunityToday 
                                    ? `${summary.bestOpportunityToday.symbol.replace("USDT", "")} (${summary.bestOpportunityToday.score})`
                                    : "—"}
                            </div>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Market Regime</div>
                            <TrendBadge trend={summary.marketRegimeTrend} />
                        </div>
                    </div>
                )}
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Opportunity Trends */}
                {trends.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm">Opportunity Trends</h3>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                            {trends.slice(0, 10).map((trend) => (
                                <motion.div
                                    key={trend.pair}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-2 bg-muted/20 rounded-lg border border-border/30 hover:border-primary/30 transition-colors cursor-pointer"
                                    onClick={() => setSelectedPair(trend.pair)}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium">{trend.pair.replace("USDT", "")}</span>
                                    </div>
                                    <TrendBadge trend={trend.trend} changePercent={trend.changePercent} />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Best Historical Opportunities */}
                {bestOpps.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm">Top Historical Opportunities</h3>
                        </div>
                        <div className="grid gap-2">
                            {bestOpps.slice(0, 5).map((opp, i) => (
                                <div
                                    key={opp.symbol}
                                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground w-4">#{i + 1}</span>
                                        <span className="font-medium">{opp.symbol.replace("USDT", "")}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs text-muted-foreground">
                                            {opp.occurrences} occurrences
                                        </span>
                                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400">
                                            Avg: {opp.avgScore}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Most Active Pairs */}
                {stats?.mostActivePairs && stats.mostActivePairs.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm">Most Active Pairs</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {stats.mostActivePairs.map((pair) => (
                                <Badge
                                    key={pair}
                                    variant="outline"
                                    className="cursor-pointer hover:bg-primary/10"
                                    onClick={() => setSelectedPair(pair)}
                                >
                                    {pair.replace("USDT", "")}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
