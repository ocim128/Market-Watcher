'use client'
/**
 * Hook for managing table filters
 */

import { useState, useMemo } from 'react'
import { useEffect, useRef } from 'react'
import { DEFAULT_FILTER_OPTIONS } from '@/types'
import type { PairAnalysisResult, FilterOptions } from '@/types'

export interface UseTableFiltersResult {
  filters: FilterOptions
  setFilters: (filters: FilterOptions) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  filteredData: PairAnalysisResult[]
  resetFilters: () => void
}

/**
 * Hook for filtering pair analysis data
 */
export function useTableFilters(analysisResults: PairAnalysisResult[]): UseTableFiltersResult {
  const [filters, setFilters] = useState<FilterOptions>(() => ({ ...DEFAULT_FILTER_OPTIONS }))
  const [searchQuery, setSearchQuery] = useState('')
  const hasMigratedLegacyDefaultsRef = useRef(false)

  useEffect(() => {
    if (hasMigratedLegacyDefaultsRef.current) {
      return
    }
    hasMigratedLegacyDefaultsRef.current = true

    const hasLegacyZeroThresholds =
      filters.minCorrelation === 0 &&
      filters.minZScore === 0 &&
      filters.minOpportunity === 0 &&
      filters.minConfluence === 0
    const hasLegacyAllQualities = filters.signalQualities.length >= 5
    const hasLegacyAllRegimes = filters.regimes.length >= 7

    if (hasLegacyZeroThresholds && hasLegacyAllQualities && hasLegacyAllRegimes) {
      setFilters({ ...DEFAULT_FILTER_OPTIONS })
    }
  }, [filters])

  const filteredData = useMemo(() => {
    if (!analysisResults) {
      return []
    }

    return analysisResults.filter(pair => {
      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        const symbolMatch = pair.symbol.toLowerCase().includes(search)
        const primaryMatch = pair.primarySymbol.toLowerCase().includes(search)
        if (!symbolMatch && !primaryMatch) {
          return false
        }
      }

      // Correlation filter
      if (Math.abs(pair.correlation) < filters.minCorrelation) {
        return false
      }

      // Z-Score filter
      if (Math.abs(pair.spreadZScore) < filters.minZScore) {
        return false
      }

      // Opportunity filter
      if (pair.opportunityScore < filters.minOpportunity) {
        return false
      }

      // Signal quality filter
      if (!filters.signalQualities.includes(pair.volatilitySpread.signalQuality)) {
        return false
      }

      // Regime filter
      if (!filters.regimes.includes(pair.correlationVelocity.regime)) {
        return false
      }

      // Confluence filter (Feature #1)
      if (pair.confluence.rating < filters.minConfluence) {
        return false
      }

      return true
    })
  }, [analysisResults, filters, searchQuery])

  const resetFilters = () => {
    setFilters({ ...DEFAULT_FILTER_OPTIONS })
    setSearchQuery('')
  }

  return {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    filteredData,
    resetFilters,
  }
}
