'use client'

import { useState, useCallback } from 'react'
import { Loader2, Settings, Clock, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScan } from '@/components/scan-context'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { SettingsPanel } from './settings-panel'
import { config, AVAILABLE_INTERVALS, getIntervalUseCase, type IntervalType } from '@/config'

interface ScanSettingsState {
  interval: IntervalType
  totalBars: number
  primaryPair: string
}

function useScanSettings() {
  const [scanSettings, setScanSettings] = useState<ScanSettingsState>({
    interval: config.interval,
    totalBars: config.totalBars,
    primaryPair: config.primaryPair,
  })

  const updateScanSettings = useCallback(
    (newSettings: Partial<ScanSettingsState>) => {
      setScanSettings(prev => ({ ...prev, ...newSettings }))
    },
    [setScanSettings]
  )

  return { scanSettings, updateScanSettings, setScanSettings }
}

function useHeaderScan(
  scanSettings: ScanSettingsState,
  setCurrentPrimaryPair: (p: string) => void
) {
  const { scan } = useScan()

  const handleScan = useCallback(async () => {
    try {
      setCurrentPrimaryPair(scanSettings.primaryPair)
      await scan({
        limit: config.topPairsLimit,
        interval: scanSettings.interval,
        totalBars: scanSettings.totalBars,
        primaryPair: scanSettings.primaryPair,
      })
    } catch (error) {
      console.error('Scan failed:', error)
    }
  }, [scan, scanSettings, setCurrentPrimaryPair])

  return handleScan
}

function formatLastScanTime(lastScanTime: Date | null): string | null {
  if (!lastScanTime) {
    return null
  }
  const now = new Date()
  const diffMs = now.getTime() - lastScanTime.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) {
    return 'Just now'
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`
  }
  return `${Math.floor(diffMins / 60)}h ago`
}

function getIntervalLabel(interval: IntervalType): string {
  const found = AVAILABLE_INTERVALS.find(i => i.value === interval)
  return found?.label || interval
}

function ConfigSummary({ settings }: { settings: ScanSettingsState }) {
  const useCase = getIntervalUseCase(settings.interval)

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="font-medium">{settings.primaryPair.replace('USDT', '')}</span>
      <span className="text-muted-foreground">·</span>
      <span>{getIntervalLabel(settings.interval)}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">{useCase}</span>
    </div>
  )
}

function NextRefreshIndicator() {
  const { isAutoRefreshEnabled, formatNextRefresh, nextRefreshIn } = useAutoRefresh()

  if (!isAutoRefreshEnabled || nextRefreshIn === null) {
    return null
  }

  return (
    <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
      <Clock className="h-3 w-3" />
      <span className="font-mono">{formatNextRefresh()}</span>
    </div>
  )
}

function ScanButton({ isScanning, onClick }: { isScanning: boolean; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={`gap-2 ${isScanning ? 'opacity-80' : ''}`}
      onClick={onClick}
      disabled={isScanning}
    >
      {isScanning ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Zap className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{isScanning ? 'Scanning...' : 'Scan'}</span>
    </Button>
  )
}

export function DashboardHeader() {
  const { isScanning, lastScanTime, setCurrentPrimaryPair } = useScan()
  const { scanSettings, setScanSettings } = useScanSettings()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleScan = useHeaderScan(scanSettings, setCurrentPrimaryPair)

  const handleScanSettingsChange = useCallback(
    (newSettings: { interval: IntervalType; totalBars: number; primaryPair: string }) => {
      setScanSettings(newSettings)
      setCurrentPrimaryPair(newSettings.primaryPair)
    },
    [setScanSettings, setCurrentPrimaryPair]
  )

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <ConfigSummary settings={scanSettings} />
            {lastScanTime && (
              <span className="text-xs">Last scan: {formatLastScanTime(lastScanTime)}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NextRefreshIndicator />
          <ScanButton isScanning={isScanning} onClick={handleScan} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="hover:bg-primary/10 hover:text-primary"
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        </div>
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        scanSettings={scanSettings}
        onScanSettingsChange={handleScanSettingsChange}
      />
    </>
  )
}
