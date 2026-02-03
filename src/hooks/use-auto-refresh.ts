"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { useScan } from "@/components/scan-context"
import { config } from "@/config"

interface UseAutoRefreshOptions {
    intervalMs?: number
    enabled?: boolean
    onRefresh?: () => void
}

/**
 * Hook for auto-refreshing scan data at regular intervals
 */
export function useAutoRefresh({
    intervalMs = config.refetchIntervalMs,
    enabled = true,
    onRefresh,
}: UseAutoRefreshOptions = {}) {
    const { scan, isScanning, lastScanTime } = useScan()
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const [nextRefreshIn, setNextRefreshIn] = useState<number | null>(null)
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(enabled)

    const refresh = useCallback(async () => {
        if (isScanning) return

        try {
            await scan()
            onRefresh?.()
        } catch (error) {
            console.error("Auto-refresh failed:", error)
        }
    }, [scan, isScanning, onRefresh])

    // Update countdown timer
    useEffect(() => {
        if (!isAutoRefreshEnabled || !lastScanTime) {
            setNextRefreshIn(null)
            return
        }

        const updateCountdown = () => {
            const elapsed = Date.now() - lastScanTime.getTime()
            const remaining = Math.max(0, intervalMs - elapsed)
            setNextRefreshIn(remaining)
        }

        updateCountdown()
        const countdownInterval = setInterval(updateCountdown, 1000)

        return () => clearInterval(countdownInterval)
    }, [isAutoRefreshEnabled, lastScanTime, intervalMs])

    // Set up auto-refresh interval
    useEffect(() => {
        if (!isAutoRefreshEnabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            return
        }

        intervalRef.current = setInterval(() => {
            refresh()
        }, intervalMs)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [isAutoRefreshEnabled, intervalMs, refresh])

    const toggleAutoRefresh = useCallback(() => {
        setIsAutoRefreshEnabled((prev) => !prev)
    }, [])

    const formatNextRefresh = useCallback(() => {
        if (nextRefreshIn === null) return null
        const minutes = Math.floor(nextRefreshIn / 60000)
        const seconds = Math.floor((nextRefreshIn % 60000) / 1000)
        return `${minutes}:${seconds.toString().padStart(2, "0")}`
    }, [nextRefreshIn])

    return {
        isAutoRefreshEnabled,
        toggleAutoRefresh,
        nextRefreshIn,
        formatNextRefresh,
        refresh,
    }
}
