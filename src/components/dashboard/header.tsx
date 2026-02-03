"use client"

import { useState, useCallback } from "react"
import { Activity, Moon, Sun, Loader2, Settings, Clock, LayoutDashboard, Zap } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

import { useScan } from "@/components/scan-context"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { SettingsPanel } from "./settings-panel"
import { config, AVAILABLE_INTERVALS, getIntervalUseCase, type IntervalType } from "@/config"

export function Header() {
    const { theme, setTheme } = useTheme()
    const { scan, isScanning, lastScanTime } = useScan()
    const { isAutoRefreshEnabled, formatNextRefresh, nextRefreshIn } = useAutoRefresh()
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)

    // Scan settings state
    const [scanSettings, setScanSettings] = useState({
        interval: config.interval,
        totalBars: config.totalBars,
        primaryPair: config.primaryPair,
    })

    const handleScan = useCallback(async () => {
        try {
            await scan({
                limit: config.topPairsLimit,
                interval: scanSettings.interval,
                totalBars: scanSettings.totalBars,
                primaryPair: scanSettings.primaryPair,
            })
        } catch (error) {
            console.error("Scan failed:", error)
        }
    }, [scan, scanSettings])

    const handleScanSettingsChange = useCallback(
        (newSettings: { interval: IntervalType; totalBars: number; primaryPair: string }) => {
            setScanSettings(newSettings)
        },
        []
    )

    const formatLastScan = () => {
        if (!lastScanTime) return null
        const now = new Date()
        const diffMs = now.getTime() - lastScanTime.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 1) return "Just now"
        if (diffMins < 60) return `${diffMins}m ago`
        const diffHours = Math.floor(diffMins / 60)
        return `${diffHours}h ago`
    }

    const getIntervalLabel = () => {
        const interval = AVAILABLE_INTERVALS.find((i) => i.value === scanSettings.interval)
        return interval?.label || scanSettings.interval
    }

    const useCase = getIntervalUseCase(scanSettings.interval)

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 mb-8 rounded-b-xl shadow-sm">
                <div className="container flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                            <LayoutDashboard className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                                Market Watcher
                            </h1>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    Live Monitor
                                </span>
                                {lastScanTime && (
                                    <span className="text-[10px] text-muted-foreground border-l border-border pl-2">
                                        Last: {formatLastScan()}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* System Status Indicators - Hidden on mobile */}
                        <div className="hidden md:flex items-center gap-3 mr-2">
                            {/* Active Status */}
                            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-xs font-medium text-emerald-500">System Active</span>
                            </div>

                            {/* Config Summary */}
                            <div className="flex flex-col items-end">
                                <div className="flex items-center gap-1.5 text-xs font-medium">
                                    <span className="text-foreground">{scanSettings.primaryPair.replace("USDT", "")}</span>
                                    <span className="text-muted-foreground">·</span>
                                    <span className="text-foreground">{getIntervalLabel()}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground">{useCase}</span>
                            </div>
                        </div>

                        <div className="h-8 w-[1px] bg-border mx-1 hidden md:block" />

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                            {isAutoRefreshEnabled && nextRefreshIn !== null && !isScanning && (
                                <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground mr-2 bg-secondary/50 px-2 py-1 rounded-md">
                                    <Clock className="h-3 w-3" />
                                    <span className="font-mono">{formatNextRefresh()}</span>
                                </div>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                className={`gap-2 ${isScanning ? "opacity-80" : ""}`}
                                onClick={handleScan}
                                disabled={isScanning}
                            >
                                {isScanning ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Zap className="h-3.5 w-3.5" />
                                )}
                                <span className="hidden sm:inline">{isScanning ? "Scanning..." : "Scan"}</span>
                            </Button>

                            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} className="hover:bg-primary/10 hover:text-primary">
                                <Settings className="h-4 w-4" />
                                <span className="sr-only">Settings</span>
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="hover:bg-primary/10 hover:text-primary"
                            >
                                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                                <span className="sr-only">Toggle theme</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <SettingsPanel
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                scanSettings={scanSettings}
                onScanSettingsChange={handleScanSettingsChange}
            />
        </>
    )
}
