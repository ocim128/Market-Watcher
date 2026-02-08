import { SlidersHorizontal, BarChart3, Coins } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AVAILABLE_SCAN_MODES, type ScanMode } from '@/config'
import { ALL_INTERVALS, PANEL_PRESETS, type PresetKey } from './constants'

interface CustomIntervalSelectorProps {
  customIntervals: string[]
  onToggleInterval: (interval: string) => void
  nativeCount: number
  resampledCount: number
}

export function CustomIntervalSelector({
  customIntervals,
  onToggleInterval,
  nativeCount,
  resampledCount,
}: CustomIntervalSelectorProps) {
  return (
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
  )
}

interface AnalysisControlsProps {
  scanMode: ScanMode
  barCount: number
  onBarCountChange: (count: number) => void
  pairLimit: number
  onPairLimitChange: (limit: number) => void
}

const PAIR_LIMIT_OPTIONS = [10, 20, 30, 50, 100, 120]

export function AnalysisControls({
  scanMode,
  barCount,
  onBarCountChange,
  pairLimit,
  onPairLimitChange,
}: AnalysisControlsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-3 bg-muted/30">
      <div className="space-y-2">
        <div className="text-xs font-medium flex items-center gap-2">
          <BarChart3 className="h-3 w-3" /> Bars per Timeframe
        </div>
        <div className="flex flex-wrap gap-1">
          {[100, 200, 500, 1000].map(count => (
            <Badge
              key={count}
              variant={barCount === count ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer text-xs',
                barCount === count ? 'bg-primary hover:bg-primary/80' : 'hover:bg-muted'
              )}
              onClick={() => onBarCountChange(count)}
            >
              {count}
            </Badge>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-medium flex items-center gap-2">
          <Coins className="h-3 w-3" />{' '}
          {scanMode === 'all_vs_all' ? 'Universe Size' : 'Max Pairs to Analyze'}
        </div>
        <div className="flex flex-wrap gap-1">
          {PAIR_LIMIT_OPTIONS.map(limit => (
            <Badge
              key={limit}
              variant={pairLimit === limit ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer text-xs',
                pairLimit === limit ? 'bg-primary hover:bg-primary/80' : 'hover:bg-muted'
              )}
              onClick={() => onPairLimitChange(limit)}
            >
              {limit}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}

interface ScanModeSelectorProps {
  scanMode: ScanMode
  onScanModeChange: (scanMode: ScanMode) => void
}

export function ScanModeSelector({ scanMode, onScanModeChange }: ScanModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {AVAILABLE_SCAN_MODES.map(mode => (
        <Button
          key={mode.value}
          variant={scanMode === mode.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => onScanModeChange(mode.value)}
          className={cn(
            'justify-start text-xs h-auto py-2',
            scanMode === mode.value && 'border-primary'
          )}
        >
          <div className="text-left">
            <div className="font-medium">{mode.label}</div>
            <div className="text-[10px] opacity-70">{mode.description}</div>
          </div>
        </Button>
      ))}
    </div>
  )
}

interface PresetSelectorProps {
  selectedPreset: PresetKey
  onPresetChange: (preset: PresetKey) => void
}

export function PresetSelector({ selectedPreset, onPresetChange }: PresetSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
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
              {PANEL_PRESETS[preset].intervals.length} intervals • {PANEL_PRESETS[preset].bars} bars
            </div>
          </div>
        </Button>
      ))}
    </div>
  )
}
