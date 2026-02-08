'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ConfluenceResult } from '@/types'
import {
  loadMockTrades,
  refreshMockTrades,
  openMockTrade,
  closeMockTrade,
  clearMockTrades,
  type MockTradeRecord,
} from '@/lib/history/mock-trades'

interface UseMockTradesReturn {
  trades: MockTradeRecord[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  refresh: () => Promise<void>
  openFromConfluence: (
    result: ConfluenceResult,
    options?: { configuredBars?: number }
  ) => Promise<MockTradeRecord | null>
  closeTrade: (tradeId: string) => Promise<void>
  clearAll: () => void
}

export function useMockTrades(): UseMockTradesReturn {
  const [trades, setTrades] = useState<MockTradeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      const updated = await refreshMockTrades()
      setTrades(updated)
    } catch (refreshError) {
      const message =
        refreshError instanceof Error ? refreshError.message : 'Failed to refresh mock trades.'
      setError(message)
      setTrades(loadMockTrades())
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    setTrades(loadMockTrades())
    refresh()
      .catch(() => {
        // Errors are stored in state.
      })
      .finally(() => setIsLoading(false))
  }, [refresh])

  const openFromConfluence = useCallback(
    async (result: ConfluenceResult, options: { configuredBars?: number } = {}) => {
      setError(null)
      try {
        const trade = await openMockTrade(result, options)
        setTrades(loadMockTrades())
        return trade
      } catch (openError) {
        const message =
          openError instanceof Error ? openError.message : 'Failed to open mock trade.'
        setError(message)
        return null
      }
    },
    []
  )

  const closeTrade = useCallback(async (tradeId: string) => {
    setError(null)
    try {
      await closeMockTrade(tradeId)
      setTrades(loadMockTrades())
    } catch (closeError) {
      const message =
        closeError instanceof Error ? closeError.message : 'Failed to close mock trade.'
      setError(message)
    }
  }, [])

  const clearAll = useCallback(() => {
    clearMockTrades()
    setTrades([])
    setError(null)
  }, [])

  return {
    trades,
    isLoading,
    isRefreshing,
    error,
    refresh,
    openFromConfluence,
    closeTrade,
    clearAll,
  }
}
