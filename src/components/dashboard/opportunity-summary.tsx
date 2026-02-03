"use client"

import { TrendingUp, Percent, BarChart3, Zap, Loader2, Sparkles } from "lucide-react"
import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useScan } from "@/components/scan-context"

interface SummaryCardProps {
    title: string
    value: string
    description: string
    icon: React.ReactNode
    trend?: "up" | "down" | "neutral"
    loading?: boolean
    highlight?: boolean
}

function SummaryCard({
    title,
    value,
    description,
    icon,
    trend,
    loading,
    highlight,
}: SummaryCardProps) {
    const trendColor =
        trend === "up"
            ? "text-emerald-500"
            : trend === "down"
                ? "text-rose-500"
                : "text-muted-foreground"

    return (
        <Card className={`relative overflow-hidden ${highlight ? "ring-2 ring-purple-500/50" : ""}`}>
            <div
                className={`absolute inset-0 ${highlight
                        ? "bg-gradient-to-br from-purple-500/10 to-pink-500/10"
                        : "bg-gradient-to-br from-primary/5 to-transparent"
                    }`}
            />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div
                    className={`h-8 w-8 rounded-md flex items-center justify-center ${highlight
                            ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                            : "bg-primary/10 text-primary"
                        }`}
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${loading ? "text-muted-foreground" : trendColor}`}>
                    {value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
        </Card>
    )
}

export function OpportunitySummary() {
    const { analysisResults, isScanning, isAnalyzing, isComplete } = useScan()

    const isLoading = isScanning || isAnalyzing

    // Calculate summary stats from analysis results
    const stats = useMemo(() => {
        if (!analysisResults || analysisResults.length === 0) {
            return {
                premiumCount: 0,
                strongCorrCount: 0,
                extremeZCount: 0,
                avgOpportunity: 0,
                topOpportunity: null as { symbol: string; score: number } | null,
            }
        }

        const premiumCount = analysisResults.filter(
            (r) => r.volatilitySpread.signalQuality === "premium"
        ).length

        const strongCorrCount = analysisResults.filter(
            (r) => Math.abs(r.correlation) >= 0.7
        ).length

        const extremeZCount = analysisResults.filter(
            (r) => Math.abs(r.spreadZScore) >= 2
        ).length

        const avgOpportunity =
            analysisResults.reduce((sum, r) => sum + r.opportunityScore, 0) /
            analysisResults.length

        const topResult = analysisResults.reduce((best, r) =>
            r.opportunityScore > (best?.opportunityScore ?? 0) ? r : best
        )

        return {
            premiumCount,
            strongCorrCount,
            extremeZCount,
            avgOpportunity,
            topOpportunity: topResult
                ? { symbol: topResult.symbol, score: topResult.opportunityScore }
                : null,
        }
    }, [analysisResults])

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
                title="Premium Signals"
                value={isLoading ? "..." : stats.premiumCount.toString()}
                description="High spread, low volatility opportunities"
                icon={<Sparkles className="h-4 w-4" />}
                trend={stats.premiumCount > 0 ? "up" : "neutral"}
                loading={isLoading}
                highlight={stats.premiumCount > 0}
            />
            <SummaryCard
                title="Strong Correlations"
                value={isLoading ? "..." : stats.strongCorrCount.toString()}
                description="Pairs with correlation > 0.7"
                icon={<TrendingUp className="h-4 w-4" />}
                trend={stats.strongCorrCount > 0 ? "up" : "neutral"}
                loading={isLoading}
            />
            <SummaryCard
                title="Extreme Z-Scores"
                value={isLoading ? "..." : stats.extremeZCount.toString()}
                description="Spread divergence > 2σ"
                icon={<BarChart3 className="h-4 w-4" />}
                trend={stats.extremeZCount > 0 ? "up" : "neutral"}
                loading={isLoading}
            />
            <SummaryCard
                title="Avg Opportunity"
                value={
                    isLoading
                        ? "..."
                        : isComplete && analysisResults.length > 0
                            ? `${stats.avgOpportunity.toFixed(0)}%`
                            : "--"
                }
                description={
                    stats.topOpportunity
                        ? `Top: ${stats.topOpportunity.symbol.replace("USDT", "")} (${stats.topOpportunity.score}%)`
                        : "Mean score across all pairs"
                }
                icon={<Percent className="h-4 w-4" />}
                trend={stats.avgOpportunity >= 40 ? "up" : "neutral"}
                loading={isLoading}
            />
        </div>
    )
}
