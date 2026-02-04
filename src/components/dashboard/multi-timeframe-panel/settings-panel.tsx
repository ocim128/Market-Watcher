'use client'

import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PANEL_PRESETS, ALL_INTERVALS, type PresetKey } from './constants'

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
}: SettingsPanelProps) {
  const activeIntervals =
    selectedPreset === 'custom' ? customIntervals : PANEL_PRESETS[selectedPreset].intervals

  const nativeCount = activeIntervals.filter(
    i => ALL_INTERVALS.find(interval => interval.value === i)?.isNative
  ).length
  const resampledCount = activeIntervals.length - nativeCount

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {(Object.keys(PANEL_PRESETS) as PresetKey[]).map(preset => (
          <Button
            key={preset}
            variant={selectedPreset === preset ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPresetChange(preset)}
            className={cn(
              'justify-start text-xs h-auto py-2',
              selectedPreset === preset && 'border-primary'
            )}
          >
            <div className="text-left">
              <div className="font-medium">{PANEL_PRESETS[preset].name}</div>
              <div className="text-[10px] opacity-70">
                {PANEL_PRESETS[preset].intervals.length} intervals • {PANEL_PRESETS[preset].bars}{' '}
                bars
              </div>
            </div>
          </Button>
        ))}
      </div>

      {/* Custom interval selector */}
      {selectedPreset === 'custom' && (
        <div className="border rounded-lg p-3 bg-muted/30">
          <div className="text-xs font-medium mb-2 flex items-center gap-2">
            <SlidersHorizontal className="h-3 w-3" />
            Select Intervals ({nativeCount} native, {resampledCount} resampled)
          </div>
          <div className="flex flex-wrap gap-1">
            {ALL_INTERVALS.map(interval => (
              <Badge
                key={interval.value}
                variant={customIntervals.includes(interval.value) ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer text-xs',
                  customIntervals.includes(interval.value)
                    ? 'bg-primary hover:bg-primary/80'
                    : 'hover:bg-muted'
                )}
                onClick={() => onToggleInterval(interval.value)}
              >
                {interval.label}
                {!interval.isNative && <span className="ml-1 text-purple-300">✨</span>}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
