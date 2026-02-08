'use client'

import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useMockTrades } from '@/hooks/use-mock-trades'
import { useMultiTimeframe } from '@/hooks/use-multi-timeframe'
import { useScan } from '@/features/scan'

import { PANEL_PRESETS, type PresetKey, sortIntervals } from './constants'
import { SettingsPanel } from './settings-panel'
import { ConfluenceCard } from './confluence-card'
import { MockTradesPanel } from './mock-trades-panel'
import { MtfHeader, ResultsSummary } from './mtf-header'
import { ScanProgress, ScanButton } from './scan-controls'
import { EmptyState, NoResultsState } from './mtf-states'

function useMtfAnalysisState() {
  const { scan, progress, results, isScanning } = useMultiTimeframe()
  const { currentPrimaryPair, currentScanMode, setCurrentScanMode } = useScan()
  const [hasScanned, setHasScanned] = useState(false)
  const [showSettings, setShowSettings] = useState(true)

  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('scalping')
  const [customIntervals, setCustomIntervals] = useState<string[]>(['1m', '3m', '5m', '15m'])
  const [barCount, setBarCount] = useState(200)
  const [pairLimit, setPairLimit] = useState(50)

  const activeIntervals =
    selectedPreset === 'custom' ? customIntervals : PANEL_PRESETS[selectedPreset].intervals

  const handleScan = async () => {
    setHasScanned(true)
    try {
      await scan({
        limit: pairLimit,
        intervals: activeIntervals,
        totalBars: barCount,
        primaryPair: currentPrimaryPair,
        scanMode: currentScanMode,
      })
    } catch (error) {
      console.error('MTF scan failed:', error)
    }
  }

  const handleToggleInterval = (interval: string) => {
    setSelectedPreset('custom')
    setCustomIntervals(prev =>
      prev.includes(interval)
        ? prev.filter(i => i !== interval)
        : sortIntervals([...prev, interval])
    )
  }

  const progressPercent =
    progress.totalIntervals > 0 ? (progress.completedIntervals / progress.totalIntervals) * 100 : 0

  return {
    progress,
    results,
    isScanning,
    currentPrimaryPair,
    currentScanMode,
    setCurrentScanMode,
    hasScanned,
    showSettings,
    setShowSettings,
    selectedPreset,
    setSelectedPreset,
    customIntervals,
    barCount,
    setBarCount,
    pairLimit,
    setPairLimit,
    activeIntervals,
    handleScan,
    handleToggleInterval,
    progressPercent,
  }
}

export function MtfAnalysis() {
  const s = useMtfAnalysisState()
  const mockTrades = useMockTrades()
  const [savingTradeKey, setSavingTradeKey] = useState<string | null>(null)

  const handleMockTrade = async (result: (typeof s.results)[number]) => {
    const pairKey = `${result.primarySymbol}|${result.symbol}`
    setSavingTradeKey(pairKey)
    await mockTrades.openFromConfluence(result, { configuredBars: s.barCount })
    setSavingTradeKey(null)
  }

  return (
    <div className="space-y-6">
      <MtfHeader
        currentPrimaryPair={s.currentPrimaryPair}
        currentScanMode={s.currentScanMode}
        resultsCount={s.results.length}
      />

      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Configuration</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => s.setShowSettings(!s.showSettings)}>
              {s.showSettings ? 'Hide' : 'Show'} Settings
            </Button>
          </div>

          <AnimatePresence>
            {s.showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <SettingsPanel
                  scanMode={s.currentScanMode}
                  onScanModeChange={s.setCurrentScanMode}
                  selectedPreset={s.selectedPreset}
                  onPresetChange={s.setSelectedPreset}
                  customIntervals={s.customIntervals}
                  onToggleInterval={s.handleToggleInterval}
                  barCount={s.barCount}
                  onBarCountChange={s.setBarCount}
                  pairLimit={s.pairLimit}
                  onPairLimitChange={s.setPairLimit}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 pt-6 border-t border-border/50">
            <ScanProgress
              isScanning={s.isScanning}
              progress={s.progress}
              progressPercent={s.progressPercent}
            />
            {!s.isScanning && (
              <ScanButton
                isScanning={s.isScanning}
                activeIntervals={s.activeIntervals}
                onScan={s.handleScan}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {s.results.length > 0 && (
        <div className="space-y-4">
          <ResultsSummary results={s.results} />
          <div className="grid gap-4">
            {s.results.map((result, index) => (
              <ConfluenceCard
                key={`${result.primarySymbol}|${result.symbol}`}
                result={result}
                index={index}
                onMockTrade={r => void handleMockTrade(r)}
                isSavingMockTrade={savingTradeKey === `${result.primarySymbol}|${result.symbol}`}
              />
            ))}
          </div>
        </div>
      )}

      <MockTradesPanel
        trades={mockTrades.trades}
        isLoading={mockTrades.isLoading}
        isRefreshing={mockTrades.isRefreshing}
        error={mockTrades.error}
        onRefresh={mockTrades.refresh}
        onCloseTrade={mockTrades.closeTrade}
        onClearAll={mockTrades.clearAll}
      />

      {s.hasScanned && !s.isScanning && s.results.length === 0 && <NoResultsState />}
      {!s.hasScanned && !s.isScanning && <EmptyState />}
    </div>
  )
}
