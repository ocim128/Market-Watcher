/* eslint-disable max-lines */
'use client'

import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { getTradFiPairs } from '@/lib/tradfi'
import {
  config,
  AVAILABLE_EXCHANGES,
  AVAILABLE_SCAN_MODES,
  AVAILABLE_INTERVALS,
  PRESET_BARS,
  AVAILABLE_PRIMARY_PAIRS,
  AVAILABLE_TRADFI_PRIMARY_PAIRS,
  getTimeDescription,
  getIntervalUseCase,
  type ExchangeType,
  type IntervalType,
  type ScanMode,
} from '@/config'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  scanSettings: {
    exchange: ExchangeType
    scanMode: ScanMode
    interval: IntervalType
    totalBars: number
    primaryPair: string
  }
  onScanSettingsChange: (settings: {
    exchange: ExchangeType
    scanMode: ScanMode
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

  useEffect(() => {
    setCustomBars(scanSettings.totalBars.toString())
  }, [scanSettings.totalBars])

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

function usePrimaryPairOptions(exchange: ExchangeType) {
  const tradfiPairsQuery = useQuery({
    queryKey: ['tradfi', 'pairs'],
    queryFn: () => getTradFiPairs(),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    enabled: exchange === 'tradfi',
  })

  const options = useMemo<PairOption[]>(() => {
    if (exchange === 'tradfi') {
      if (tradfiPairsQuery.data && tradfiPairsQuery.data.length > 0) {
        return tradfiPairsQuery.data.map(symbol => ({
          value: symbol,
          label: symbol,
          description: 'TradFi',
        }))
      }
      return AVAILABLE_TRADFI_PRIMARY_PAIRS.map(pair => ({
        value: pair.value,
        label: pair.label,
        description: pair.description,
      }))
    }

    return AVAILABLE_PRIMARY_PAIRS.map(pair => ({
      value: pair.value,
      label: pair.label,
      description: pair.description,
    }))
  }, [tradfiPairsQuery.data, exchange])

  return {
    options,
    isLoading: exchange === 'tradfi' && tradfiPairsQuery.isLoading,
  }
}

interface PrimaryPairSelectorProps {
  value: string
  onChange: (value: string) => void
  options: PairOption[]
  isLoading: boolean
}

interface PairOption {
  value: string
  label: string
  description: string
}

interface ExchangeSelectorProps {
  value: ExchangeType
  onChange: (value: ExchangeType) => void
}

interface ScanModeSelectorProps {
  value: ScanMode
  onChange: (value: ScanMode) => void
}

function ExchangeSelector({ value, onChange }: ExchangeSelectorProps) {
  return (
    <div className="space-y-1">
      {AVAILABLE_EXCHANGES.map(exchange => (
        <button
          key={exchange.value}
          onClick={() => onChange(exchange.value)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
            value === exchange.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/50 hover:bg-secondary'
          }`}
        >
          <span className="font-medium">{exchange.label}</span>
          <span
            className={`text-xs ${value === exchange.value ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
          >
            {exchange.description}
          </span>
        </button>
      ))}
    </div>
  )
}

function ScanModeSelector({ value, onChange }: ScanModeSelectorProps) {
  return (
    <div className="space-y-1">
      {AVAILABLE_SCAN_MODES.map(mode => (
        <button
          key={mode.value}
          onClick={() => onChange(mode.value)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded text-sm transition-colors ${
            value === mode.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary/50 hover:bg-secondary'
          }`}
        >
          <span className="font-medium">{mode.label}</span>
          <span
            className={`text-xs ${value === mode.value ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
          >
            {mode.description}
          </span>
        </button>
      ))}
    </div>
  )
}

function PrimaryPairSelector({ value, onChange, options, isLoading }: PrimaryPairSelectorProps) {
  const [search, setSearch] = useState('')

  const visibleOptions = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = query
      ? options.filter(
          pair =>
            pair.value.toLowerCase().includes(query) || pair.label.toLowerCase().includes(query)
        )
      : options

    return filtered.slice(0, 120)
  }, [options, search])

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search pair (e.g. BTCUSDT)"
        className="w-full px-3 py-1.5 bg-secondary rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
      />

      <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
        {isLoading && (
          <p className="text-xs text-muted-foreground px-2 py-1">Loading exchange pairs...</p>
        )}

        {!isLoading &&
          visibleOptions.map(pair => (
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

        {!isLoading && visibleOptions.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-1">No pair matches your search.</p>
        )}
      </div>
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
  pairOptions,
  isPairLoading,
  customBars,
  timeDescription,
  useCaseDescription,
  handleBarsChange,
  handlePresetBars,
}: {
  scanSettings: SettingsPanelProps['scanSettings']
  onScanSettingsChange: SettingsPanelProps['onScanSettingsChange']
  pairOptions: PairOption[]
  isPairLoading: boolean
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
        <label className="text-xs text-muted-foreground block mb-2">Pair Source</label>
        <ExchangeSelector
          value={scanSettings.exchange}
          onChange={value => onScanSettingsChange({ ...scanSettings, exchange: value })}
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground block mb-2">Scan Mode</label>
        <ScanModeSelector
          value={scanSettings.scanMode}
          onChange={value => onScanSettingsChange({ ...scanSettings, scanMode: value })}
        />
      </div>

      {scanSettings.scanMode === 'primary_vs_all' && (
        <div>
          <label className="text-xs text-muted-foreground block mb-2">
            <GitCompare className="h-3 w-3 inline mr-1" />
            Primary Pair (Reference)
          </label>
          <PrimaryPairSelector
            value={scanSettings.primaryPair}
            options={pairOptions}
            isLoading={isPairLoading}
            onChange={value => onScanSettingsChange({ ...scanSettings, primaryPair: value })}
          />
          <p className="text-xs text-muted-foreground mt-2">
            All pairs will be analyzed against the selected primary pair
          </p>
        </div>
      )}

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
        <span>Pair Source:</span>
        <span className="font-mono">{scanSettings.exchange}</span>
        <span>Scan Mode:</span>
        <span className="font-mono">{scanSettings.scanMode}</span>
        <span>Primary Pair:</span>
        <span className="font-mono text-primary">
          {scanSettings.scanMode === 'all_vs_all' ? 'N/A (all pairs)' : scanSettings.primaryPair}
        </span>
        <span>Scan Universe:</span>
        <span className="font-mono">
          {scanSettings.exchange === 'tradfi' ? 'All TradFi pairs' : `Top ${config.topPairsLimit}`}
        </span>
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
  const { options: pairOptions, isLoading: isPairLoading } = usePrimaryPairOptions(
    scanSettings.exchange
  )

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

  useEffect(() => {
    if (pairOptions.length === 0) {
      return
    }

    const exists = pairOptions.some(pair => pair.value === scanSettings.primaryPair)
    if (!exists && scanSettings.scanMode === 'primary_vs_all') {
      onScanSettingsChange({ ...scanSettings, primaryPair: pairOptions[0].value })
    }
  }, [pairOptions, scanSettings, onScanSettingsChange])

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
            pairOptions={pairOptions}
            isPairLoading={isPairLoading}
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
