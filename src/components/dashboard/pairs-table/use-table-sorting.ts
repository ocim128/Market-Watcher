/**
 * Hook for managing table sorting
 */

import { useState, useMemo, useCallback } from 'react'
import type { PairAnalysisResult, SignalQuality } from '@/types'
import { signalQualityOrder } from './utils'

export type SortKey =
  | 'symbol'
  | 'correlation'
  | 'spreadZScore'
  | 'opportunityScore'
  | 'signalQuality'

export type SortOrder = 'asc' | 'desc'

export interface SortConfig {
  key: SortKey
  order: SortOrder
}

export interface UseTableSortingResult {
  sortConfig: SortConfig
  sortedData: PairAnalysisResult[]
  handleSort: (key: SortKey) => void
}

/**
 * Hook for sorting pair analysis data
 */
export function useTableSorting(filteredData: PairAnalysisResult[]): UseTableSortingResult {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'opportunityScore',
    order: 'desc',
  })

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal: number | string
      let bVal: number | string

      switch (sortConfig.key) {
        case 'symbol':
          aVal = a.symbol
          bVal = b.symbol
          break
        case 'correlation':
          aVal = Math.abs(a.correlation)
          bVal = Math.abs(b.correlation)
          break
        case 'spreadZScore':
          aVal = Math.abs(a.spreadZScore)
          bVal = Math.abs(b.spreadZScore)
          break
        case 'opportunityScore':
          aVal = a.opportunityScore
          bVal = b.opportunityScore
          break
        case 'signalQuality':
          aVal = signalQualityOrder[a.volatilitySpread.signalQuality as SignalQuality]
          bVal = signalQualityOrder[b.volatilitySpread.signalQuality as SignalQuality]
          break
        default:
          aVal = a.opportunityScore
          bVal = b.opportunityScore
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      return sortConfig.order === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [filteredData, sortConfig])

  const handleSort = useCallback((key: SortKey) => {
    setSortConfig(current => ({
      key,
      order: current.key === key && current.order === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  return {
    sortConfig,
    sortedData,
    handleSort,
  }
}
