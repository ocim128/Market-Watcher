/* eslint-disable max-lines */
'use client'

import { useState } from 'react'
import {
  Settings,
  RefreshCw,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Clock,
  X,
  BarChart3,
  GitCompare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { useNotifications } from '@/hooks/use-notifications'
import {
  config,
  AVAILABLE_INTERVALS,
  PRESET_BARS,
  AVAILABLE_PRIMARY_PAIRS,
  getTimeDescription,
  getIntervalUseCase,
  type IntervalType,
} from '@/config'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  scanSettings: {
    interval: IntervalType
    totalBars: number
    primaryPair: string
  }
  onScanSettingsChange: (settings: {
    interval: IntervalType
    totalBars: number
    primaryPair: string
  }) => void
}

function useSettingsPanelState(
  scanSettings: SettingsPanelProps['scanSettings'],
  onScanSettingsChange: SettingsPanelProps['onScanSettingsChange']
) {
  const { isAutoRefreshEnabled, toggleAutoRefresh, nextRefreshIn, formatNextRefresh } =
    useAutoRefresh()
  const {
    permission,
    isEnabled: isNotificationsEnabled,
    isSoundEnabled,
    requestPermission,
    toggleNotifications,
    toggleSound,
  } = useNotifications()

  const [customBars, setCustomBars] = useState<string>(scanSettings.totalBars.toString())

  const timeDescription = getTimeDescription(scanSettings.interval, scanSettings.totalBars)
  const useCaseDescription = getIntervalUseCase(scanSettings.interval)

  const handleBarsChange = (value: string) => {
    setCustomBars(value)
    const parsed = parseInt(value, 10)
    if (!isNaN(parsed) && parsed >= 50 && parsed <= config.maxBars) {
      onScanSettingsChange({ ...scanSettings, totalBars: parsed })
    }
  }

  const handlePresetBars = (value: number) => {
    setCustomBars(value.toString())
    onScanSettingsChange({ ...scanSettings, totalBars: value })
  }

  return {
    isAutoRefreshEnabled,
    toggleAutoRefresh,
    nextRefreshIn,
    formatNextRefresh,
    permission,
    isNotificationsEnabled,
    isSoundEnabled,
    requestPermission,
    toggleNotifications,
    toggleSound,
    customBars,
    timeDescription,
    useCaseDescription,
    handleBarsChange,
    handlePresetBars,
  }
}

interface PrimaryPairSelectorProps {
  value: string
  onChange: (value: string) => void
}

function PrimaryPairSelector({ value, onChange }: PrimaryPairSelectorProps) {
  return (
    <div className="space-y-1">
      {AVAILABLE_PRIMARY_PAIRS.map(pair => (
        <button
          key={pair.value}
          onClick={() => onChange(pair.value)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
            value === pair.value
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-secondary/50 hover:bg-secondary'
          }`}
        >
          <span className="font-medium font-mono">{pair.label}</span>
          <span
            className={`text-xs ${value === pair.value ? 'text-white/80' : 'text-muted-foreground'}`}
          >
            {pair.description}
          </span>
        </button>
      ))}
    </div>
  )
}

interface IntervalSelectorProps {
  value: IntervalType
  onChange: (value: IntervalType) => void
}

function IntervalSelector({ value, onChange }: IntervalSelectorProps) {
  return (
    <div className="space-y-1">
      {AVAILABLE_INTERVALS.map(interval => (
        <button
          key={interval.value}
          onClick={() => onChange(interval.value)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
            value === interval.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/50 hover:bg-secondary'
          }`}
        >
          <span className="font-medium">{interval.label}</span>
          <span
            className={`text-xs ${value === interval.value ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
          >
            {interval.useCase}
          </span>
        </button>
      ))}
    </div>
  )
}

interface BarsSelectorProps {
  value: number
  customValue: string
  onChange: (value: number) => void
  onCustomChange: (value: string) => void
}

function BarsSelector({ value, customValue, onChange, onCustomChange }: BarsSelectorProps) {
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-2">
        {PRESET_BARS.map(barOption => (
          <button
            key={barOption.value}
            onClick={() => onChange(barOption.value)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              value === barOption.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary hover:bg-secondary/80'
            }`}
          >
            {barOption.label}
          </button>
        ))}
      </div>
      <input
        type="number"
        min={50}
        max={config.maxBars}
        value={customValue}
        onChange={e => onCustomChange(e.target.value)}
        className="w-full px-3 py-1.5 bg-secondary rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
        placeholder="Custom bars (50-10000)"
      />
    </div>
  )
}

interface TimeInfoProps {
  timeDescription: string
  useCaseDescription: string
}

function TimeInfo({ timeDescription, useCaseDescription }: TimeInfoProps) {
  return (
    <div className="mt-2 p-2 bg-secondary/30 rounded text-xs">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Coverage:</span>
        <span className="font-medium">{timeDescription}</span>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-muted-foreground">Strategy:</span>
        <span className="font-medium text-primary">{useCaseDescription}</span>
      </div>
    </div>
  )
}

function ScanSettingsSection({
  scanSettings,
  onScanSettingsChange,
  customBars,
  timeDescription,
  useCaseDescription,
  handleBarsChange,
  handlePresetBars,
}: {
  scanSettings: SettingsPanelProps['scanSettings']
  onScanSettingsChange: SettingsPanelProps['onScanSettingsChange']
  customBars: string
  timeDescription: string
  useCaseDescription: string
  handleBarsChange: (value: string) => void
  handlePresetBars: (value: number) => void
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Scan Parameters
      </h4>

      <div>
        <label className="text-xs text-muted-foreground block mb-2">
          <GitCompare className="h-3 w-3 inline mr-1" />
          Primary Pair (Reference)
        </label>
        <PrimaryPairSelector
          value={scanSettings.primaryPair}
          onChange={value => onScanSettingsChange({ ...scanSettings, primaryPair: value })}
        />
        <p className="text-xs text-muted-foreground mt-2">
          All pairs will be analyzed against the selected primary pair
        </p>
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-2">Timeframe</label>
        <IntervalSelector
          value={scanSettings.interval}
          onChange={value => onScanSettingsChange({ ...scanSettings, interval: value })}
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-2">Lookback Bars</label>
        <BarsSelector
          value={scanSettings.totalBars}
          customValue={customBars}
          onChange={handlePresetBars}
          onCustomChange={handleBarsChange}
        />
        <TimeInfo timeDescription={timeDescription} useCaseDescription={useCaseDescription} />
      </div>
    </div>
  )
}

function AutoRefreshSection({
  isEnabled,
  nextRefresh,
  formatRefresh,
  onToggle,
}: {
  isEnabled: boolean
  nextRefresh: number | null
  formatRefresh: () => string | null
  onToggle: () => void
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Auto-Refresh
      </h4>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm">Refresh every {config.refetchIntervalMs / 60000} min</p>
          {isEnabled && nextRefresh !== null && (
            <p className="text-xs text-muted-foreground">Next refresh in: {formatRefresh()}</p>
          )}
        </div>
        <Button
          variant={isEnabled ? 'default' : 'outline'}
          size="sm"
          onClick={onToggle}
          className="gap-1"
        >
          {isEnabled ? (
            <>
              <RefreshCw className="h-4 w-4" /> On
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" /> Off
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function NotificationsSection({
  permission,
  isEnabled,
  isSoundEnabled,
  onRequestPermission,
  onToggle,
  onToggleSound,
}: {
  permission: NotificationPermission
  isEnabled: boolean
  isSoundEnabled: boolean
  onRequestPermission: () => void
  onToggle: () => void
  onToggleSound: () => void
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Bell className="h-4 w-4" />
        Notifications
      </h4>

      {permission === 'default' && (
        <Button variant="outline" size="sm" onClick={onRequestPermission} className="w-full">
          Enable Browser Notifications
        </Button>
      )}

      {permission === 'denied' && (
        <p className="text-xs text-destructive">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      )}

      {permission === 'granted' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm">Premium signal alerts</p>
            <Button
              variant={isEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={onToggle}
              className="gap-1"
            >
              {isEnabled ? (
                <>
                  <Bell className="h-4 w-4" /> On
                </>
              ) : (
                <>
                  <BellOff className="h-4 w-4" /> Off
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm">Sound effects</p>
            <Button
              variant={isSoundEnabled ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleSound}
              className="gap-1"
              disabled={!isEnabled}
            >
              {isSoundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4" /> On
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4" /> Off
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function CurrentConfig({ scanSettings }: { scanSettings: SettingsPanelProps['scanSettings'] }) {
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <h4 className="text-sm font-medium text-foreground">Current Config</h4>
      <div className="grid grid-cols-2 gap-1">
        <span>Primary Pair:</span>
        <span className="font-mono text-primary">{scanSettings.primaryPair}</span>
        <span>Top Pairs:</span>
        <span className="font-mono">{config.topPairsLimit}</span>
      </div>
    </div>
  )
}

export function SettingsPanel({
  isOpen,
  onClose,
  scanSettings,
  onScanSettingsChange,
}: SettingsPanelProps) {
  const {
    isAutoRefreshEnabled,
    toggleAutoRefresh,
    nextRefreshIn,
    formatNextRefresh,
    permission,
    isNotificationsEnabled,
    isSoundEnabled,
    requestPermission,
    toggleNotifications,
    toggleSound,
    customBars,
    timeDescription,
    useCaseDescription,
    handleBarsChange,
    handlePresetBars,
  } = useSettingsPanelState(scanSettings, onScanSettingsChange)

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/50"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-sm mt-16 mr-4 shadow-xl max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <CardHeader className="pb-3 sticky top-0 bg-card z-10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>Configure scan parameters and preferences</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <ScanSettingsSection
            scanSettings={scanSettings}
            onScanSettingsChange={onScanSettingsChange}
            customBars={customBars}
            timeDescription={timeDescription}
            useCaseDescription={useCaseDescription}
            handleBarsChange={handleBarsChange}
            handlePresetBars={handlePresetBars}
          />

          <div className="border-t border-border" />

          <AutoRefreshSection
            isEnabled={isAutoRefreshEnabled}
            nextRefresh={nextRefreshIn}
            formatRefresh={formatNextRefresh}
            onToggle={toggleAutoRefresh}
          />

          <div className="border-t border-border" />

          <NotificationsSection
            permission={permission}
            isEnabled={isNotificationsEnabled}
            isSoundEnabled={isSoundEnabled}
            onRequestPermission={requestPermission}
            onToggle={toggleNotifications}
            onToggleSound={toggleSound}
          />

          <div className="border-t border-border" />

          <CurrentConfig scanSettings={scanSettings} />
        </CardContent>
      </Card>
    </div>
  )
}
