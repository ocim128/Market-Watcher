/* eslint-disable max-lines-per-function */

'use client'

import { Button } from '@/components/ui/button'
import type { OptimizedParams } from '@/types/backtest-types'

interface OptimizationSettings {
  trainWindow: number
  testWindow: number
}

interface OptimizationPanelProps {
  settings: OptimizationSettings
  optimizedParams: OptimizedParams | null
  isOptimizing: boolean
  error: string | null
  hasPriceData: boolean
  onSettingsChange: (partial: Partial<OptimizationSettings>) => void
  onOptimize: () => void
  onApply: () => void
}

function NumberInput({
  label,
  value,
  min,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={event => onChange(Number(event.target.value) || min)}
        className="w-full px-2 py-1 rounded bg-background border text-sm"
      />
    </div>
  )
}

function formatDelta(value: number): string {
  return value >= 0 ? `+${value.toFixed(2)}%` : `${value.toFixed(2)}%`
}

export function OptimizationPanel({
  settings,
  optimizedParams,
  isOptimizing,
  error,
  hasPriceData,
  onSettingsChange,
  onOptimize,
  onApply,
}: OptimizationPanelProps) {
  return (
    <div className="p-4 bg-muted/30 rounded-lg border border-border/40 space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Walk-Forward Optimization</p>
          <p className="text-xs text-muted-foreground">
            Optimizes parameters on rolling train/test windows for this pair.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onOptimize}
            disabled={!hasPriceData || isOptimizing}
          >
            {isOptimizing ? 'Optimizing...' : 'Optimize'}
          </Button>
          <Button size="sm" onClick={onApply} disabled={!optimizedParams || isOptimizing}>
            Apply
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <NumberInput
          label="Train Window (bars)"
          value={settings.trainWindow}
          min={120}
          step={20}
          onChange={value => onSettingsChange({ trainWindow: value })}
        />
        <NumberInput
          label="Test Window (bars)"
          value={settings.testWindow}
          min={120}
          step={20}
          onChange={value => onSettingsChange({ testWindow: value })}
        />
      </div>

      {optimizedParams && (
        <div className="text-xs rounded bg-background/50 border border-border/40 p-3 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <span className="text-muted-foreground">Entry Z:</span>{' '}
              <span className="font-mono">
                {optimizedParams.config.entrySpreadThreshold.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Min Corr:</span>{' '}
              <span className="font-mono">{optimizedParams.config.minCorrelation.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">TP:</span>{' '}
              <span className="font-mono">
                {optimizedParams.config.takeProfitPercent.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">SL:</span>{' '}
              <span className="font-mono">
                {optimizedParams.config.stopLossPercent.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <span className="text-muted-foreground">Windows:</span>{' '}
              <span className="font-mono">{optimizedParams.windowsEvaluated}</span>
            </div>
            <div>
              <span className="text-muted-foreground">WF Profit:</span>{' '}
              <span className="font-mono">
                {formatDelta(optimizedParams.walkForwardProfitPercent)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Baseline:</span>{' '}
              <span className="font-mono">
                {formatDelta(optimizedParams.baselineProfitPercent)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Delta:</span>{' '}
              <span
                className={`font-mono ${optimizedParams.improvementPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
              >
                {formatDelta(optimizedParams.improvementPercent)}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
