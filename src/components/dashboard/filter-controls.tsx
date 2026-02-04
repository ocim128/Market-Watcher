'use client'

import { useState, useMemo } from 'react'
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

export function FilterControls({
  filters,
  onFiltersChange,
  searchQuery,
  onSearchChange,
}: FilterControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasActiveFilters = useMemo(() => {
    return (
      filters.minCorrelation > 0 ||
      filters.minZScore > 0 ||
      filters.minOpportunity > 0 ||
      filters.signalQualities.length < SIGNAL_QUALITIES.length ||
      filters.regimes.length < REGIMES.length
    )
  }, [filters])

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

  const resetFilters = () => {
    onFiltersChange(DEFAULT_FILTER_OPTIONS)
    onSearchChange('')
  }

  return (
    <div className="space-y-3">
      {/* Search and toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search pairs..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-secondary/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

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

      {/* Expanded filters */}
      {isExpanded && (
        <div className="p-4 bg-secondary/30 rounded-lg space-y-4">
          {/* Thresholds */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Min Correlation: {filters.minCorrelation.toFixed(2)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={filters.minCorrelation}
                onChange={e =>
                  onFiltersChange({ ...filters, minCorrelation: parseFloat(e.target.value) })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Min Z-Score: {filters.minZScore.toFixed(1)}σ
              </label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.25"
                value={filters.minZScore}
                onChange={e =>
                  onFiltersChange({ ...filters, minZScore: parseFloat(e.target.value) })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Min Opportunity: {filters.minOpportunity}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.minOpportunity}
                onChange={e =>
                  onFiltersChange({ ...filters, minOpportunity: parseFloat(e.target.value) })
                }
                className="w-full"
              />
            </div>
          </div>

          {/* Signal Quality */}
          <div>
            <label className="text-sm text-muted-foreground block mb-2">Signal Quality</label>
            <div className="flex flex-wrap gap-2">
              {SIGNAL_QUALITIES.map(quality => (
                <button
                  key={quality}
                  onClick={() => toggleSignalQuality(quality)}
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

          {/* Regimes */}
          <div>
            <label className="text-sm text-muted-foreground block mb-2">Correlation Regime</label>
            <div className="flex flex-wrap gap-2">
              {REGIMES.map(regime => (
                <button
                  key={regime}
                  onClick={() => toggleRegime(regime)}
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
        </div>
      )}
    </div>
  )
}
