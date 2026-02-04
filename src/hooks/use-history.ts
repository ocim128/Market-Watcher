'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  saveSnapshot,
  loadHistory,
  getPairHistory,
  getOpportunityTrends,
  getBestHistoricalOpportunities,
  getHistoryStats,
  getHistorySummary,
  exportHistoryToCSV,
  clearHistory,
  type HistoricalRecord,
  type PairHistoricalData,
  type OpportunityTrend,
  type HistoryStats,
} from '@/lib/history/tracking'
import type { PairAnalysisResult, ConfluenceResult } from '@/types'

interface UseHistoryReturn {
  // Actions
  recordSnapshot: (
    results: PairAnalysisResult[],
    primaryPair: string,
    interval: string,
    confluenceResults?: ConfluenceResult[]
  ) => HistoricalRecord
  clearAllHistory: () => void
  downloadCSV: () => void

  // Queries
  getHistoryForPair: (symbol: string) => PairHistoricalData | null
  getTrends: () => OpportunityTrend[]
  getBestOpportunities: (
    limit?: number,
    minQuality?: string
  ) => {
    symbol: string
    avgScore: number
    occurrences: number
    lastSeen: number
  }[]
  getStats: () => HistoryStats
  getSummary: () => {
    snapshotsToday: number
    uniquePairsTracked: number
    bestOpportunityToday: { symbol: string; score: number } | null
    marketRegimeTrend: 'improving' | 'declining' | 'stable'
  }

  // State
  history: HistoricalRecord[]
  refreshHistory: () => void
}

/**
 * Hook for accessing historical tracking data
 */
export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<HistoricalRecord[]>([])

  // Load history on mount (client-side only)
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const refreshHistory = useCallback(() => {
    setHistory(loadHistory())
  }, [])

  const recordSnapshot = useCallback(
    (
      results: PairAnalysisResult[],
      primaryPair: string,
      interval: string,
      confluenceResults?: ConfluenceResult[]
    ) => {
      const record = saveSnapshot(results, primaryPair, interval, confluenceResults)
      refreshHistory()
      return record
    },
    [refreshHistory]
  )

  const clearAllHistory = useCallback(() => {
    clearHistory()
    refreshHistory()
  }, [refreshHistory])

  const downloadCSV = useCallback(() => {
    const csv = exportHistoryToCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `market-watcher-history-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const getHistoryForPair = useCallback((symbol: string) => {
    return getPairHistory(symbol)
  }, [])

  const getTrends = useCallback(() => {
    return getOpportunityTrends()
  }, [])

  const getBestOpportunities = useCallback((limit?: number, minQuality?: string) => {
    return getBestHistoricalOpportunities(limit, minQuality)
  }, [])

  const getStats = useCallback(() => {
    return getHistoryStats()
  }, [])

  const getSummary = useCallback(() => {
    return getHistorySummary()
  }, [])

  return {
    recordSnapshot,
    clearAllHistory,
    downloadCSV,
    getHistoryForPair,
    getTrends,
    getBestOpportunities,
    getStats,
    getSummary,
    history,
    refreshHistory,
  }
}
