/* eslint-disable max-lines */
'use client'

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SignalQuality, CorrelationRegime, FilterOptions } from '@/types'
import { DEFAULT_FILTER_OPTIONS } from '@/types'

interface FilterControlsProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

const SIGNAL_QUALITIES: SignalQuality[] = ['premium', 'strong', 'moderate', 'weak', 'noisy']
const REGIMES: CorrelationRegime[] = [
  'stable_strong',
  'strengthening',
  'recovering',
  'stable',
  'weakening',
  'stable_weak',
  'breaking_down',
]

function getSignalLabel(quality: SignalQuality) {
  const labels: Record<SignalQuality, string> = {
    premium: '💎 Premium',
    strong: '💪 Strong',
    moderate: '📊 Moderate',
    weak: '📉 Weak',
    noisy: '🔊 Noisy',
    insufficient_data: '⚠️ No Data',
  }
  return labels[quality]
}

function getRegimeLabel(regime: CorrelationRegime) {
  const labels: Record<CorrelationRegime, string> = {
    stable_strong: '✅ Stable Strong',
    stable_weak: '⚠️ Stable Weak',
    stable: '➖ Stable',
    strengthening: '📈 Strengthening',
    recovering: '🔄 Recovering',
    weakening: '📉 Weakening',
    breaking_down: '🔻 Breaking Down',
  }
  return labels[regime]
}

function useHasActiveFilters(filters: FilterOptions): boolean {
  return useMemo(() => {
    const sameSignalQualities =
      filters.signalQualities.length === DEFAULT_FILTER_OPTIONS.signalQualities.length &&
      filters.signalQualities.every(q => DEFAULT_FILTER_OPTIONS.signalQualities.includes(q))
    const sameRegimes =
      filters.regimes.length === DEFAULT_FILTER_OPTIONS.regimes.length &&
      filters.regimes.every(r => DEFAULT_FILTER_OPTIONS.regimes.includes(r))

    return (
      filters.minCorrelation !== DEFAULT_FILTER_OPTIONS.minCorrelation ||
      filters.minZScore !== DEFAULT_FILTER_OPTIONS.minZScore ||
      filters.minOpportunity !== DEFAULT_FILTER_OPTIONS.minOpportunity ||
      filters.minConfluence !== DEFAULT_FILTER_OPTIONS.minConfluence ||
      !sameSignalQualities ||
      !sameRegimes
    )
  }, [filters])
}

function useFilterControlsState(
  filters: FilterOptions,
  onFiltersChange: (f: FilterOptions) => void
) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasActiveFilters = useHasActiveFilters(filters)

  const toggleSignalQuality = (quality: SignalQuality) => {
    const isSelected = filters.signalQualities.includes(quality)
    const newQualities = isSelected
      ? filters.signalQualities.filter(q => q !== quality)
      : [...filters.signalQualities, quality]
    onFiltersChange({ ...filters, signalQualities: newQualities })
  }

  const toggleRegime = (regime: CorrelationRegime) => {
    const isSelected = filters.regimes.includes(regime)
    const newRegimes = isSelected
      ? filters.regimes.filter(r => r !== regime)
      : [...filters.regimes, regime]
    onFiltersChange({ ...filters, regimes: newRegimes })
  }

  return { isExpanded, setIsExpanded, hasActiveFilters, toggleSignalQuality, toggleRegime }
}

interface FilterSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (value: number) => void
}

function FilterSlider({ label, value, min, max, step, format, onChange }: FilterSliderProps) {
  return (
    <div>
      <label className="text-sm text-muted-foreground block mb-1">
        {label}: {format(value)}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </div>
  )
}

function ThresholdFilters({
  filters,
  onFiltersChange,
}: {
  filters: FilterOptions
  onFiltersChange: (f: FilterOptions) => void
}) {
  const sliders = [
    {
      label: 'Min Correlation',
      value: filters.minCorrelation,
      min: 0,
      max: 1,
      step: 0.05,
      format: (v: number) => v.toFixed(2),
      onChange: (v: number) => onFiltersChange({ ...filters, minCorrelation: v }),
    },
    {
      label: 'Min Z-Score',
      value: filters.minZScore,
      min: 0,
      max: 3,
      step: 0.25,
      format: (v: number) => `${v.toFixed(1)}σ`,
      onChange: (v: number) => onFiltersChange({ ...filters, minZScore: v }),
    },
    {
      label: 'Min Opportunity',
      value: filters.minOpportunity,
      min: 0,
      max: 100,
      step: 5,
      format: (v: number) => `${v}%`,
      onChange: (v: number) => onFiltersChange({ ...filters, minOpportunity: v }),
    },
    {
      label: 'Min Confluence',
      value: filters.minConfluence,
      min: 0,
      max: 3,
      step: 1,
      format: (v: number) => `${v}/3`,
      onChange: (v: number) => onFiltersChange({ ...filters, minConfluence: v }),
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {sliders.map(s => (
        <FilterSlider key={s.label} {...s} />
      ))}
    </div>
  )
}

function SignalQualityFilter({
  filters,
  onToggle,
}: {
  filters: FilterOptions
  onToggle: (quality: SignalQuality) => void
}) {
  return (
    <div>
      <label className="text-sm text-muted-foreground block mb-2">Signal Quality</label>
      <div className="flex flex-wrap gap-2">
        {SIGNAL_QUALITIES.map(quality => (
          <button
            key={quality}
            onClick={() => onToggle(quality)}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              filters.signalQualities.includes(quality)
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {getSignalLabel(quality)}
          </button>
        ))}
      </div>
    </div>
  )
}

function RegimeFilter({
  filters,
  onToggle,
}: {
  filters: FilterOptions
  onToggle: (regime: CorrelationRegime) => void
}) {
  return (
    <div>
      <label className="text-sm text-muted-foreground block mb-2">Correlation Regime</label>
      <div className="flex flex-wrap gap-2">
        {REGIMES.map(regime => (
          <button
            key={regime}
            onClick={() => onToggle(regime)}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              filters.regimes.includes(regime)
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {getRegimeLabel(regime)}
          </button>
        ))}
      </div>
    </div>
  )
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search pairs..."
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-9 pr-4 py-2 bg-secondary/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2">
          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>
      )}
    </div>
  )
}

export function FilterControls({
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
}: FilterControlsProps) {
  const { isExpanded, setIsExpanded, hasActiveFilters, toggleSignalQuality, toggleRegime } =
    useFilterControlsState(filters, onFiltersChange)

  const resetFilters = () => {
    onFiltersChange(DEFAULT_FILTER_OPTIONS)
    onSearchChange('')
  }

  return (
    <div className="space-y-3">
      {/* Search and toggle */}
      <div className="flex items-center gap-2">
        <SearchInput value={searchQuery} onChange={onSearchChange} />

        <Button
          variant={isExpanded ? 'secondary' : 'outline'}
          size="sm"
          className="gap-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
              !
            </Badge>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="p-4 bg-secondary/30 rounded-lg space-y-4">
          <ThresholdFilters filters={filters} onFiltersChange={onFiltersChange} />
          <SignalQualityFilter filters={filters} onToggle={toggleSignalQuality} />
          <RegimeFilter filters={filters} onToggle={toggleRegime} />
        </div>
      )}
    </div>
  )
}
