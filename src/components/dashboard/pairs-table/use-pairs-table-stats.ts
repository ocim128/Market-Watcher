/**
 * Hook for calculating pairs table statistics
 */

import { useMemo } from 'react'
import type { PairAnalysisResult } from '@/types'

export interface PairsTableStats {
  total: number
  filtered: number
  premium: number
}

/**
 * Hook for calculating table statistics
 */
export function usePairsTableStats(
  analysisResults: PairAnalysisResult[],
  filteredData: PairAnalysisResult[]
): PairsTableStats {
  return useMemo(() => {
    if (!analysisResults || analysisResults.length === 0) {
      return { total: 0, filtered: 0, premium: 0 }
    }

    return {
      total: analysisResults.length,
      filtered: filteredData.length,
      premium: filteredData.filter(r => r.volatilitySpread.signalQuality === 'premium').length,
    }
  }, [analysisResults, filteredData])
}
