'use client'

import type { ScanMode } from '@/config'
import { PANEL_PRESETS, ALL_INTERVALS, type PresetKey } from './constants'
import {
  CustomIntervalSelector,
  AnalysisControls,
  PresetSelector,
  ScanModeSelector,
} from './settings-controls'

interface SettingsPanelProps {
  scanMode: ScanMode
  onScanModeChange: (scanMode: ScanMode) => void
  selectedPreset: PresetKey
  onPresetChange: (preset: PresetKey) => void
  customIntervals: string[]
  onToggleInterval: (interval: string) => void
  barCount: number
  onBarCountChange: (count: number) => void
  pairLimit: number
  onPairLimitChange: (limit: number) => void
}

/**
 * Settings panel for multi-timeframe configuration
 */
export function SettingsPanel({
  scanMode,
  onScanModeChange,
  selectedPreset,
  onPresetChange,
  customIntervals,
  onToggleInterval,
  barCount,
  onBarCountChange,
  pairLimit,
  onPairLimitChange,
}: SettingsPanelProps) {
  const activeIntervals =
    selectedPreset === 'custom' ? customIntervals : PANEL_PRESETS[selectedPreset].intervals

  const nativeCount = activeIntervals.filter(
    i => ALL_INTERVALS.find(interval => interval.value === i)?.isNative
  ).length
  const resampledCount = activeIntervals.length - nativeCount

  return (
    <div className="space-y-4">
      <ScanModeSelector scanMode={scanMode} onScanModeChange={onScanModeChange} />

      <PresetSelector selectedPreset={selectedPreset} onPresetChange={onPresetChange} />

      {selectedPreset === 'custom' && (
        <CustomIntervalSelector
          customIntervals={customIntervals}
          onToggleInterval={onToggleInterval}
          nativeCount={nativeCount}
          resampledCount={resampledCount}
        />
      )}

      <AnalysisControls
        scanMode={scanMode}
        barCount={barCount}
        onBarCountChange={onBarCountChange}
        pairLimit={pairLimit}
        onPairLimitChange={onPairLimitChange}
      />
    </div>
  )
}
