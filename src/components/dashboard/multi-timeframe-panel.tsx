"use client"

import { useState } from "react"
import {
    Layers, Loader2, Zap, Target,
    ArrowRight, SlidersHorizontal, Sparkles
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useMultiTimeframe } from "@/hooks/use-multi-timeframe"
import { useScan } from "@/components/scan-context"
import type { ConfluenceResult } from "@/types"
import { getScalpingIntervals, isBinanceNativeInterval } from "@/lib/binance/resample"
import { cn } from "@/lib/utils"

const CONFIDENCE_COLORS = {
    high: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    mixed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
}

const CONFIDENCE_EMOJI = {
    high: "🟢",
    medium: "🟡",
    low: "🟠",
    mixed: "🔴",
}

// Extended interval type to include custom intervals
// type ExtendedInterval = string

// All available intervals including custom resampled ones
const ALL_INTERVALS = getScalpingIntervals().map(i => ({
    value: i.value,
    label: i.label,
    description: i.description,
    isNative: isBinanceNativeInterval(i.value),
}))

// Presets
type PresetKey = "scalping" | "ultra" | "intraday" | "advanced" | "custom"

const PANEL_PRESETS: Record<PresetKey, { name: string; intervals: string[]; bars: number; description: string }> = {
    ultra: {
        name: "Ultra Scalp (1m-5m)",
        intervals: ["1m", "2m", "3m", "4m", "5m"],
        bars: 200,
        description: "Every 1-minute step for maximum precision",
    },
    scalping: {
        name: "Scalping (1m-15m)",
        intervals: ["1m", "3m", "5m", "7m", "10m", "15m"],
        bars: 200,
        description: "Optimal scalping timeframes with custom intervals",
    },
    intraday: {
        name: "Intraday (5m-4h)",
        intervals: ["5m", "15m", "30m", "1h", "4h"],
        bars: 300,
        description: "Standard intraday/swing trading timeframes",
    },
    advanced: {
        name: "Advanced (All 1m-15m)",
        intervals: ["1m", "2m", "3m", "4m", "5m", "6m", "7m", "8m", "9m", "10m", "15m"],
        bars: 150,
        description: "All intervals from 1m to 15m (slower but comprehensive)",
    },
    custom: {
        name: "Custom",
        intervals: ["1m", "3m", "5m", "15m"],
        bars: 200,
        description: "User-defined configuration",
    },
}

interface TimeframeBadgeProps {
    interval: string
    score: number
    isBest?: boolean
    isWorst?: boolean
}

function TimeframeBadge({ interval, score, isBest, isWorst }: TimeframeBadgeProps) {
    const isNative = isBinanceNativeInterval(interval)

    return (
        <div
            className={cn(
                "flex flex-col items-center p-2 rounded-lg border transition-all",
                isBest && "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
                isWorst && "bg-rose-500/10 border-rose-500/30",
                !isBest && !isWorst && "bg-muted/30 border-border/50"
            )}
        >
            <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">{interval}</span>
                {!isNative && (
                    <span title="Resampled from 1m data">
                        <Sparkles className="h-3 w-3 text-purple-400" />
                    </span>
                )}
            </div>
            <span className={cn(
                "text-lg font-bold",
                score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-muted-foreground"
            )}>
                {score}
            </span>
            {isBest && <span className="text-[10px] text-emerald-400">★ Best</span>}
        </div>
    )
}

interface ConfluenceCardProps {
    result: ConfluenceResult
    index: number
}

function ConfluenceCard({ result, index }: ConfluenceCardProps) {
    const [expanded, setExpanded] = useState(false)

    // Check for suspicious data: all scores identical
    const opportunityScores = result.timeframeAnalyses.map(ta => ta.result.opportunityScore)
    const allScoresIdentical = new Set(opportunityScores).size === 1 && opportunityScores.length > 2
    const hasDataQualityIssue = allScoresIdentical || result.notes.some(n => n.includes("⚠️ Data quality"))

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <Card className={cn(
                "border-border/40 bg-card/50 backdrop-blur-sm transition-all cursor-pointer hover:border-primary/30",
                result.confidence === "high" && !hasDataQualityIssue && "border-emerald-500/20",
                result.confidence === "medium" && !hasDataQualityIssue && "border-amber-500/20",
                hasDataQualityIssue && "border-rose-500/30 bg-rose-500/5",
            )}>
                {/* Data quality warning banner */}
                {hasDataQualityIssue && (
                    <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-2">
                        <span className="text-rose-400 text-xs font-medium">
                            ⚠️ Data Quality Issue - All intervals show identical scores
                        </span>
                    </div>
                )}
                <CardHeader className="pb-3" onClick={() => setExpanded(!expanded)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                                <CardTitle className="text-lg">
                                    {result.symbol.replace("USDT", "")}
                                    <span className="text-muted-foreground text-sm ml-2">vs {result.primarySymbol.replace("USDT", "")}</span>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {result.alignedTimeframes}/{result.totalTimeframes} timeframes aligned
                                </CardDescription>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge
                                variant="outline"
                                className={cn(
                                    "uppercase text-[10px] tracking-wider",
                                    CONFIDENCE_COLORS[result.confidence]
                                )}
                            >
                                {CONFIDENCE_EMOJI[result.confidence]} {result.confidence}
                            </Badge>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-primary">
                                    {result.confluenceScore}
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Confluence
                                </div>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-0">
                    {/* Timeframe scores */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        {result.timeframeAnalyses.map((ta) => (
                            <TimeframeBadge
                                key={ta.interval}
                                interval={ta.interval}
                                score={ta.result.opportunityScore}
                                isBest={ta.interval === result.bestTimeframe}
                                isWorst={ta.interval === result.worstTimeframe}
                            />
                        ))}
                    </div>

                    {/* Signal direction */}
                    {result.signalDirection !== "neutral" && (
                        <div className="flex items-center gap-2 mb-3 p-2 bg-primary/5 rounded-lg border border-primary/10">
                            <Target className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                                Signal: <span className={result.signalDirection === "long_spread" ? "text-emerald-400" : "text-rose-400"}>
                                    {result.signalDirection === "long_spread" ? "LONG Spread" : "SHORT Spread"}
                                </span>
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
                            <span className="text-xs text-muted-foreground">
                                {result.signalDirection === "long_spread"
                                    ? "Buy Primary / Sell Secondary"
                                    : "Sell Primary / Buy Secondary"}
                            </span>
                        </div>
                    )}

                    {/* Agreement metrics */}
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                        <div className="p-2 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Z-Score</div>
                            <div className={cn(
                                "text-sm font-bold",
                                result.zScoreAgreement > 0.7 ? "text-emerald-400" : result.zScoreAgreement > 0.4 ? "text-amber-400" : "text-rose-400"
                            )}>
                                {Math.round(result.zScoreAgreement * 100)}%
                            </div>
                        </div>
                        <div className="p-2 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Correlation</div>
                            <div className={cn(
                                "text-sm font-bold",
                                result.correlationAgreement > 0.7 ? "text-emerald-400" : result.correlationAgreement > 0.4 ? "text-amber-400" : "text-rose-400"
                            )}>
                                {Math.round(result.correlationAgreement * 100)}%
                            </div>
                        </div>
                        <div className="p-2 bg-muted/30 rounded-lg">
                            <div className="text-xs text-muted-foreground mb-1">Quality</div>
                            <div className={cn(
                                "text-sm font-bold",
                                result.qualityAgreement > 0.7 ? "text-emerald-400" : result.qualityAgreement > 0.4 ? "text-amber-400" : "text-rose-400"
                            )}>
                                {Math.round(result.qualityAgreement * 100)}%
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="pt-3 border-t border-border/50 space-y-1">
                                    {result.notes.map((note, i) => (
                                        <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                            <span>{note}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="text-center mt-2">
                        <span className="text-[10px] text-muted-foreground">
                            {expanded ? "Click to collapse" : "Click to expand details"}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

export function MultiTimeframePanel() {
    const { scan, progress, results, isScanning, isComplete } = useMultiTimeframe()
    const { currentPrimaryPair } = useScan()
    const [hasScanned, setHasScanned] = useState(false)
    const [showSettings, setShowSettings] = useState(false)

    // Settings state
    const [selectedPreset, setSelectedPreset] = useState<PresetKey>("scalping")
    const [customIntervals, setCustomIntervals] = useState<string[]>(["1m", "3m", "5m", "15m"])
    const [barCount, setBarCount] = useState(200)
    const [pairLimit, setPairLimit] = useState(10)

    // Use preset or custom intervals
    const activeIntervals = selectedPreset === "custom"
        ? customIntervals
        : PANEL_PRESETS[selectedPreset].intervals

    const handleScan = async () => {
        setHasScanned(true)
        try {
            await scan({
                limit: pairLimit,
                intervals: activeIntervals,
                totalBars: barCount,
                primaryPair: currentPrimaryPair, // Use the primary pair from settings
            })
        } catch (error) {
            console.error("MTF scan failed:", error)
        }
    }

    const progressPercent = progress.totalIntervals > 0
        ? (progress.completedIntervals / progress.totalIntervals) * 100
        : 0

    const toggleInterval = (interval: string) => {
        setSelectedPreset("custom")
        setCustomIntervals(prev =>
            prev.includes(interval)
                ? prev.filter(i => i !== interval)
                : [...prev, interval].sort((a, b) => {
                    // Sort by minutes value
                    const getMinutes = (int: string) => {
                        const val = parseInt(int)
                        const unit = int.slice(-1)
                        if (unit === 'h') return val * 60
                        if (unit === 'd') return val * 60 * 24
                        return val
                    }
                    return getMinutes(a) - getMinutes(b)
                })
        )
    }

    // Count native vs resampled
    const nativeCount = activeIntervals.filter(i => isBinanceNativeInterval(i)).length
    const resampledCount = activeIntervals.length - nativeCount

    return (
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                            <Layers className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">Multi-Timeframe Confluence</CardTitle>
                            <CardDescription className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-primary">{currentPrimaryPair.replace("USDT", "")}</span>
                                <span className="text-muted-foreground">•</span>
                                <span>{activeIntervals.join(", ")}</span>
                                <span className="text-muted-foreground">•</span>
                                <span>{barCount} bars</span>
                                <span className="text-muted-foreground">•</span>
                                <span>{pairLimit} pairs</span>
                                {resampledCount > 0 && (
                                    <>
                                        <span className="text-muted-foreground">•</span>
                                        <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            {resampledCount} resampled
                                        </Badge>
                                    </>
                                )}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn(
                                "hover:bg-primary/10 hover:text-primary transition-colors",
                                showSettings && "bg-primary/10 text-primary"
                            )}
                            title="Configure MTF Settings"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                        <Button
                            onClick={handleScan}
                            disabled={isScanning || activeIntervals.length < 2}
                            className="gap-2"
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Scanning...
                                </>
                            ) : (
                                <>
                                    <Zap className="h-4 w-4" />
                                    MTF Scan
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Settings Panel */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                                {/* Presets */}
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                        Preset Strategy
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {(Object.keys(PANEL_PRESETS) as PresetKey[])
                                            .filter(key => key !== "custom")
                                            .map((key) => (
                                                <Button
                                                    key={key}
                                                    variant={selectedPreset === key ? "default" : "outline"}
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedPreset(key)
                                                        setCustomIntervals(PANEL_PRESETS[key].intervals)
                                                        setBarCount(PANEL_PRESETS[key].bars)
                                                    }}
                                                    className="text-xs"
                                                >
                                                    {PANEL_PRESETS[key].name}
                                                </Button>
                                            ))}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        {PANEL_PRESETS[selectedPreset]?.description || "Custom configuration"}
                                    </p>
                                </div>

                                {/* Custom Interval Selection */}
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                        Timeframes (select 2-11) •
                                        <span className="text-emerald-400 ml-1">Native</span> •
                                        <span className="text-purple-400 ml-1">Resampled ✨</span>
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {ALL_INTERVALS.map(({ value, label, isNative }) => (
                                            <Badge
                                                key={value}
                                                variant={activeIntervals.includes(value) ? "default" : "outline"}
                                                className={cn(
                                                    "cursor-pointer transition-all",
                                                    activeIntervals.includes(value) && isNative && "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30",
                                                    activeIntervals.includes(value) && !isNative && "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30",
                                                    !activeIntervals.includes(value) && "hover:bg-muted"
                                                )}
                                                onClick={() => toggleInterval(value)}
                                            >
                                                {label}
                                                {!isNative && <Sparkles className="h-3 w-3 ml-1 inline" />}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                {/* Bar Count */}
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            Bar Count per Timeframe
                                        </label>
                                        <span className="text-xs font-mono text-primary">{barCount}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="500"
                                        step="50"
                                        value={barCount}
                                        onChange={(e) => setBarCount(Number(e.target.value))}
                                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                        <span>50 (faster)</span>
                                        <span>500 (more accurate)</span>
                                    </div>
                                </div>

                                {/* Pair Limit */}
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            Max Pairs to Analyze
                                        </label>
                                        <span className="text-xs font-mono text-primary">{pairLimit}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="3"
                                        max="30"
                                        step="1"
                                        value={pairLimit}
                                        onChange={(e) => setPairLimit(Number(e.target.value))}
                                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                        <span>3</span>
                                        <span>30</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        Note: Resampled intervals fetch extra 1m data.
                                        Example: 7m needs 7× the 1m bars, so fetching {barCount} 7m bars = ~{barCount * 7} 1m bars
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Progress */}
                {isScanning && (
                    <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {progress.currentSymbol} ({progress.currentInterval})
                            </span>
                            <span className="font-mono text-xs">
                                {progress.completedIntervals} / {progress.totalIntervals}
                            </span>
                        </div>
                        <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden">
                            <motion.div
                                className="bg-gradient-to-r from-purple-500 to-purple-300 h-full rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>
                )}
            </CardHeader>

            <CardContent>
                {!hasScanned ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/20 mb-4">
                            <Layers className="h-8 w-8 text-purple-400" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">Multi-Timeframe Analysis with Resampling</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                            Now supports custom intervals like <span className="text-purple-400">2m, 4m, 7m, 10m</span>!
                            These are resampled from 1m data for more granular confluence detection.
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                <div className="font-medium text-emerald-400 mb-1">1m, 3m, 5m, 15m</div>
                                <div className="text-muted-foreground">Native Binance</div>
                            </div>
                            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                <div className="font-medium text-purple-400 mb-1">2m, 4m, 6m-10m</div>
                                <div className="text-muted-foreground">Resampled ✨</div>
                            </div>
                            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <div className="font-medium text-blue-400 mb-1">Up to 11 intervals</div>
                                <div className="text-muted-foreground">Maximum confluence</div>
                            </div>
                            <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                <div className="font-medium text-amber-400 mb-1">Scalping Optimized</div>
                                <div className="text-muted-foreground">1m-15m range</div>
                            </div>
                        </div>
                    </div>
                ) : results.length > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Found <span className="text-foreground font-medium">{results.length}</span> confluence signals
                            </div>
                            <div className="flex gap-2">
                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400">
                                    {results.filter(r => r.confidence === "high").length} High
                                </Badge>
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-400">
                                    {results.filter(r => r.confidence === "medium").length} Medium
                                </Badge>
                            </div>
                        </div>

                        <div className="grid gap-3">
                            {results.slice(0, 10).map((result, index) => (
                                <ConfluenceCard key={result.symbol} result={result} index={index} />
                            ))}
                        </div>

                        {results.length > 10 && (
                            <div className="text-center text-sm text-muted-foreground pt-2">
                                + {results.length - 10} more results
                            </div>
                        )}
                    </div>
                ) : isComplete ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-4 bg-muted/30 rounded-full mb-4">
                            <Target className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">No Confluence Signals</h3>
                        <p className="text-muted-foreground text-sm max-w-md">
                            No pairs showed strong alignment across {activeIntervals.length} timeframes.
                            Try different intervals or wait for better setups.
                        </p>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )
}
