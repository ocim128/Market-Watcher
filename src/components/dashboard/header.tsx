"use client"

import { useState, useCallback } from "react"
import { Activity, RefreshCw, Moon, Sun, Loader2, Settings, Clock, Timer } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useScan } from "@/components/scan-context"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { SettingsPanel } from "./settings-panel"
import { config, AVAILABLE_INTERVALS, getIntervalUseCase, type IntervalType, type PrimaryPairType } from "@/config"

export function Header() {
    const { theme, setTheme } = useTheme()
    const { scan, progress, isScanning, lastScanTime } = useScan()
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
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                        <Activity className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight gradient-text">Market Watcher</h1>
                        <p className="text-sm text-muted-foreground">
                            Pair Trading Opportunity Dashboard
                            {lastScanTime && (
                                <span className="ml-2 text-xs">• Last scan: {formatLastScan()}</span>
                            )}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Current settings indicator */}
                    <div className="hidden sm:flex flex-col items-end text-xs bg-secondary/50 px-3 py-1.5 rounded">
                        <div className="flex items-center gap-1 text-foreground">
                            <Timer className="h-3 w-3" />
                            <span className="font-mono">
                                {scanSettings.primaryPair.replace("USDT", "")} · {getIntervalLabel()} · {scanSettings.totalBars} bars
                            </span>
                        </div>
                        <span className="text-muted-foreground">{useCase}</span>
                    </div>

                    {/* Auto-refresh indicator */}
                    {isAutoRefreshEnabled && nextRefreshIn !== null && !isScanning && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{formatNextRefresh()}</span>
                        </div>
                    )}

                    {/* Scanning progress */}
                    {isScanning && (
                        <div className="text-sm text-muted-foreground">
                            <span className="font-mono">
                                {progress.current}/{progress.total}
                            </span>
                            {progress.currentSymbol && (
                                <span className="ml-2 text-xs hidden sm:inline">{progress.currentSymbol}</span>
                            )}
                        </div>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={handleScan}
                        disabled={isScanning}
                    >
                        {isScanning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        {isScanning ? "Scanning..." : "Scan Pairs"}
                    </Button>

                    <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)}>
                        <Settings className="h-4 w-4" />
                        <span className="sr-only">Settings</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    >
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
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
