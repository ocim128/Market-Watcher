'use client'

import { PANEL_PRESETS, ALL_INTERVALS, type PresetKey } from './constants'
import { CustomIntervalSelector, AnalysisControls, PresetSelector } from './settings-controls'

interface SettingsPanelProps {
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
        barCount={barCount}
        onBarCountChange={onBarCountChange}
        pairLimit={pairLimit}
        onPairLimitChange={onPairLimitChange}
      />
    </div>
  )
}
