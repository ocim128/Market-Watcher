"use client"

import { useState } from "react"
import {
    Settings,
    RefreshCw,
    Bell,
    BellOff,
    Volume2,
    VolumeX,
    Clock,
    X,
    BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAutoRefresh } from "@/hooks/use-auto-refresh"
import { useNotifications } from "@/hooks/use-notifications"
import {
    config,
    AVAILABLE_INTERVALS,
    PRESET_BARS,
    getTimeDescription,
    getIntervalUseCase,
    type IntervalType,
} from "@/config"

interface SettingsPanelProps {
    isOpen: boolean
    onClose: () => void
    scanSettings: {
        interval: IntervalType
        totalBars: number
    }
    onScanSettingsChange: (settings: { interval: IntervalType; totalBars: number }) => void
}

export function SettingsPanel({
    isOpen,
    onClose,
    scanSettings,
    onScanSettingsChange,
}: SettingsPanelProps) {
    const { isAutoRefreshEnabled, toggleAutoRefresh, nextRefreshIn, formatNextRefresh } =
        useAutoRefresh()

    const {
        permission,
        isEnabled: isNotificationsEnabled,
        isSoundEnabled,
        requestPermission,
        toggleNotifications,
        toggleSound,
    } = useNotifications()

    const [customBars, setCustomBars] = useState<string>(scanSettings.totalBars.toString())

    if (!isOpen) return null

    const timeDescription = getTimeDescription(scanSettings.interval, scanSettings.totalBars)
    const useCaseDescription = getIntervalUseCase(scanSettings.interval)

    const handleBarsChange = (value: string) => {
        setCustomBars(value)
        const parsed = parseInt(value, 10)
        if (!isNaN(parsed) && parsed >= 50 && parsed <= config.maxBars) {
            onScanSettingsChange({
                ...scanSettings,
                totalBars: parsed,
            })
        }
    }

    const handlePresetBars = (value: number) => {
        setCustomBars(value.toString())
        onScanSettingsChange({
            ...scanSettings,
            totalBars: value,
        })
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/50"
            onClick={onClose}
        >
            <Card
                className="w-full max-w-sm mt-16 mr-4 shadow-xl max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <CardHeader className="pb-3 sticky top-0 bg-card z-10">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Settings
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <CardDescription>Configure scan parameters and preferences</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Scan Settings */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Scan Parameters
                        </h4>

                        {/* Timeframe */}
                        <div>
                            <label className="text-xs text-muted-foreground block mb-2">Timeframe</label>
                            <div className="space-y-1">
                                {AVAILABLE_INTERVALS.map((interval) => (
                                    <button
                                        key={interval.value}
                                        onClick={() =>
                                            onScanSettingsChange({
                                                ...scanSettings,
                                                interval: interval.value,
                                            })
                                        }
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${scanSettings.interval === interval.value
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-secondary/50 hover:bg-secondary"
                                            }`}
                                    >
                                        <span className="font-medium">{interval.label}</span>
                                        <span
                                            className={`text-xs ${scanSettings.interval === interval.value
                                                    ? "text-primary-foreground/80"
                                                    : "text-muted-foreground"
                                                }`}
                                        >
                                            {interval.useCase}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bars - Presets + Custom Input */}
                        <div>
                            <label className="text-xs text-muted-foreground block mb-2">Lookback Bars</label>

                            {/* Preset buttons */}
                            <div className="flex flex-wrap gap-1 mb-2">
                                {PRESET_BARS.map((barOption) => (
                                    <button
                                        key={barOption.value}
                                        onClick={() => handlePresetBars(barOption.value)}
                                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${scanSettings.totalBars === barOption.value
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-secondary hover:bg-secondary/80"
                                            }`}
                                    >
                                        {barOption.label}
                                    </button>
                                ))}
                            </div>

                            {/* Custom input */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min={50}
                                    max={config.maxBars}
                                    value={customBars}
                                    onChange={(e) => handleBarsChange(e.target.value)}
                                    className="w-full px-3 py-1.5 bg-secondary rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Custom bars (50-10000)"
                                />
                            </div>

                            <div className="mt-2 p-2 bg-secondary/30 rounded text-xs">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Coverage:</span>
                                    <span className="font-medium">{timeDescription}</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-muted-foreground">Strategy:</span>
                                    <span className="font-medium text-primary">{useCaseDescription}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-border" />

                    {/* Auto-Refresh */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Auto-Refresh
                        </h4>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm">Refresh every {config.refetchIntervalMs / 60000} min</p>
                                {isAutoRefreshEnabled && nextRefreshIn !== null && (
                                    <p className="text-xs text-muted-foreground">
                                        Next refresh in: {formatNextRefresh()}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant={isAutoRefreshEnabled ? "default" : "outline"}
                                size="sm"
                                onClick={toggleAutoRefresh}
                                className="gap-1"
                            >
                                {isAutoRefreshEnabled ? (
                                    <>
                                        <RefreshCw className="h-4 w-4" />
                                        On
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4" />
                                        Off
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="border-t border-border" />

                    {/* Notifications */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Notifications
                        </h4>

                        {permission === "default" && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={requestPermission}
                                className="w-full"
                            >
                                Enable Browser Notifications
                            </Button>
                        )}

                        {permission === "denied" && (
                            <p className="text-xs text-destructive">
                                Notifications are blocked. Please enable them in your browser settings.
                            </p>
                        )}

                        {permission === "granted" && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm">Premium signal alerts</p>
                                    <Button
                                        variant={isNotificationsEnabled ? "default" : "outline"}
                                        size="sm"
                                        onClick={toggleNotifications}
                                        className="gap-1"
                                    >
                                        {isNotificationsEnabled ? (
                                            <>
                                                <Bell className="h-4 w-4" />
                                                On
                                            </>
                                        ) : (
                                            <>
                                                <BellOff className="h-4 w-4" />
                                                Off
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className="text-sm">Sound effects</p>
                                    <Button
                                        variant={isSoundEnabled ? "default" : "outline"}
                                        size="sm"
                                        onClick={toggleSound}
                                        className="gap-1"
                                        disabled={!isNotificationsEnabled}
                                    >
                                        {isSoundEnabled ? (
                                            <>
                                                <Volume2 className="h-4 w-4" />
                                                On
                                            </>
                                        ) : (
                                            <>
                                                <VolumeX className="h-4 w-4" />
                                                Off
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-border" />

                    {/* Info */}
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <h4 className="text-sm font-medium text-foreground">Current Config</h4>
                        <div className="grid grid-cols-2 gap-1">
                            <span>Primary Pair:</span>
                            <span className="font-mono">{config.primaryPair}</span>
                            <span>Top Pairs:</span>
                            <span className="font-mono">{config.topPairsLimit}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
