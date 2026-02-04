'use client'

import { useState } from 'react'
import { Layers, Loader2, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMultiTimeframe } from '@/hooks/use-multi-timeframe'
import { useScan } from '@/features/scan'

import type { ConfluenceResult } from '@/types'
import { PANEL_PRESETS, type PresetKey, sortIntervals } from './constants'
import { SettingsPanel } from './settings-panel'
import { ConfluenceCard } from './confluence-card'

/**
 * Multi-Timeframe Confluence Panel
 *
 * Analyzes trading pairs across multiple timeframes to find
 * high-confidence confluence signals.
 */
export function MultiTimeframePanel() {
  const { scan, progress, results, isScanning } = useMultiTimeframe()
  const { currentPrimaryPair } = useScan()
  const [hasScanned, setHasScanned] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  // Settings state
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('scalping')
  const [customIntervals, setCustomIntervals] = useState<string[]>(['1m', '3m', '5m', '15m'])
  const [barCount, setBarCount] = useState(200)
  const [pairLimit, setPairLimit] = useState(10)

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

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <PanelHeader
          currentPrimaryPair={currentPrimaryPair}
          isScanning={isScanning}
          progress={progress}
          _progressPercent={progressPercent}
          resultsCount={results.length}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings(!showSettings)}
        />

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-border/50 mt-4">
                <SettingsPanel
                  selectedPreset={selectedPreset}
                  onPresetChange={setSelectedPreset}
                  customIntervals={customIntervals}
                  onToggleInterval={handleToggleInterval}
                  barCount={barCount}
                  onBarCountChange={setBarCount}
                  pairLimit={pairLimit}
                  onPairLimitChange={setPairLimit}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>

      <CardContent>
        {/* Scan Button */}
        <ScanButton isScanning={isScanning} activeIntervals={activeIntervals} onScan={handleScan} />

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6 space-y-4">
            <ResultsSummary results={results} />
            {results.map((result, index) => (
              <ConfluenceCard key={result.symbol} result={result} index={index} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!hasScanned && !isScanning && results.length === 0 && <EmptyState />}
      </CardContent>
    </Card>
  )
}

// Sub-components

interface PanelHeaderProps {
  currentPrimaryPair: string
  isScanning: boolean
  progress: { completedIntervals: number; totalIntervals: number; currentSymbol: string }
  _progressPercent: number
  resultsCount: number
  showSettings: boolean
  onToggleSettings: () => void
}

function PanelHeader({
  currentPrimaryPair,
  isScanning,
  progress,
  _progressPercent,
  resultsCount,
  showSettings,
  onToggleSettings,
}: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <Layers className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <CardTitle className="text-lg">Multi-Timeframe Confluence</CardTitle>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-primary">
              {currentPrimaryPair.replace('USDT', '')}
            </span>
            {isScanning && progress.totalIntervals > 0 && (
              <span className="ml-2">
                Scanning {progress.currentSymbol}... ({progress.completedIntervals}/
                {progress.totalIntervals})
              </span>
            )}
            {!isScanning && resultsCount > 0 && (
              <span className="ml-2 text-emerald-400">{resultsCount} signals found</span>
            )}
          </div>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onToggleSettings}>
        {showSettings ? 'Hide' : 'Settings'}
      </Button>
    </div>
  )
}

interface ScanButtonProps {
  isScanning: boolean
  activeIntervals: string[]
  onScan: () => void
}

function ScanButton({ isScanning, activeIntervals, onScan }: ScanButtonProps) {
  return (
    <Button
      onClick={onScan}
      disabled={isScanning}
      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
    >
      {isScanning ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Scanning {activeIntervals.length} timeframes...
        </>
      ) : (
        <>
          <Zap className="h-4 w-4 mr-2" />
          MTF Scan ({activeIntervals.length} intervals)
        </>
      )}
    </Button>
  )
}

function ResultsSummary({ results }: { results: ConfluenceResult[] }) {
  const highConfidence = results.filter(r => r.confidence === 'high').length
  const withSignal = results.filter(r => r.signalDirection !== 'neutral').length

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground">
      <span>
        <strong className="text-foreground">{results.length}</strong> pairs analyzed
      </span>
      {highConfidence > 0 && (
        <span className="text-emerald-400">
          <strong>{highConfidence}</strong> high confidence
        </span>
      )}
      {withSignal > 0 && (
        <span className="text-primary">
          <strong>{withSignal}</strong> with signal
        </span>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <p className="text-sm">Click "MTF Scan" to analyze multiple timeframes</p>
      <p className="text-xs mt-1">This helps identify high-confidence confluence signals</p>
    </div>
  )
}
