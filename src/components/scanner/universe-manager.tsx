'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { UniverseSettings } from '@/lib/scanner'

interface UniverseManagerProps {
  settings: UniverseSettings
  disabled?: boolean
  onChange: (settings: Partial<UniverseSettings>) => void
}

export function UniverseManager({ settings, disabled, onChange }: UniverseManagerProps) {
  const [exclusionInput, setExclusionInput] = useState(settings.exclusions.join(', '))

  const exclusionCount = useMemo(() => settings.exclusions.length, [settings.exclusions])

  const applyExclusions = () => {
    const exclusions = exclusionInput
      .split(',')
      .map(item => item.trim().toUpperCase())
      .filter(Boolean)

    onChange({ exclusions })
  }

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg">Universe Manager</CardTitle>
        <CardDescription>Configure momentum thresholds and pair universe size</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Pair Limit ({settings.pairLimit})</span>
            <input
              type="range"
              min={50}
              max={200}
              step={5}
              value={settings.pairLimit}
              disabled={disabled}
              onChange={event => onChange({ pairLimit: Number(event.target.value) })}
              className="w-full"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">Refresh Every (days)</span>
            <input
              type="number"
              min={1}
              max={60}
              value={settings.refreshIntervalDays}
              disabled={disabled}
              onChange={event =>
                onChange({ refreshIntervalDays: Number(event.target.value) || 14 })
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">3M Threshold (%)</span>
            <input
              type="number"
              min={0}
              max={500}
              value={settings.thresholds.perf3m}
              disabled={disabled}
              onChange={event =>
                onChange({
                  thresholds: {
                    ...settings.thresholds,
                    perf3m: Number(event.target.value) || 0,
                  },
                })
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">6M Threshold (%)</span>
            <input
              type="number"
              min={0}
              max={600}
              value={settings.thresholds.perf6m}
              disabled={disabled}
              onChange={event =>
                onChange({
                  thresholds: {
                    ...settings.thresholds,
                    perf6m: Number(event.target.value) || 0,
                  },
                })
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-muted-foreground">12M Threshold (%)</span>
            <input
              type="number"
              min={0}
              max={1000}
              value={settings.thresholds.perf12m}
              disabled={disabled}
              onChange={event =>
                onChange({
                  thresholds: {
                    ...settings.thresholds,
                    perf12m: Number(event.target.value) || 0,
                  },
                })
              }
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Exclusion List (comma separated)</label>
          <textarea
            value={exclusionInput}
            disabled={disabled}
            onChange={event => setExclusionInput(event.target.value)}
            onBlur={applyExclusions}
            rows={2}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="USDCUSDT, FDUSDUSDT"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{exclusionCount} symbols excluded</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={applyExclusions}
            >
              Apply Exclusions
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
