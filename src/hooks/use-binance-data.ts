'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { config, type ExchangeType } from '@/config'
import {
  getTopUsdtPairs,
  fetchKlinesPaged,
  fetchMultipleKlines,
  extractClosePrices,
} from '@/lib/binance'
import type { BinanceKline } from '@/types'

// Query keys for cache management
export const queryKeys = {
  topPairs: (exchange: ExchangeType = config.exchange) => [exchange, 'topPairs'] as const,
  klines: (symbol: string, interval: string, exchange: ExchangeType = config.exchange) =>
    [exchange, 'klines', symbol, interval] as const,
  allKlines: (interval: string, exchange: ExchangeType = config.exchange) =>
    [exchange, 'allKlines', interval] as const,
}

/**
 * Hook to fetch top USDT pairs by volume
 */
export function useTopPairs(limit: number = config.topPairsLimit) {
  return useQuery({
    queryKey: [...queryKeys.topPairs('binance_spot'), limit],
    queryFn: () => getTopUsdtPairs(limit),
    staleTime: 30 * 60 * 1000, // 30 minutes - pairs don't change often
    gcTime: 60 * 60 * 1000, // 1 hour
  })
}

/**
 * Hook to fetch klines for a single symbol
 */
export function useKlines(
  symbol: string | undefined,
  interval: string = config.interval,
  totalBars: number = config.totalBars
) {
  return useQuery({
    queryKey: queryKeys.klines(symbol || '', interval),
    queryFn: () => fetchKlinesPaged(symbol!, interval, totalBars),
    enabled: !!symbol,
    staleTime: config.staleTimeMs,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Hook to get close prices from klines
 */
export function useClosePrices(
  symbol: string | undefined,
  interval: string = config.interval,
  totalBars: number = config.totalBars
) {
  const klinesQuery = useKlines(symbol, interval, totalBars)

  return {
    ...klinesQuery,
    data: klinesQuery.data ? extractClosePrices(klinesQuery.data) : undefined,
  }
}

/**
 * Hook to fetch primary pair klines (e.g., ETHUSDT)
 */
export function usePrimaryPairKlines(
  interval: string = config.interval,
  totalBars: number = config.totalBars
) {
  return useKlines(config.primaryPair, interval, totalBars)
}

/**
 * Hook to prefetch klines for multiple symbols
 */
export function usePrefetchKlines() {
  const queryClient = useQueryClient()

  const prefetch = async (
    symbols: string[],
    interval: string = config.interval,
    totalBars: number = config.totalBars
  ) => {
    // Check which symbols need fetching
    const symbolsToFetch = symbols.filter(symbol => {
      const cached = queryClient.getQueryData(queryKeys.klines(symbol, interval))
      return !cached
    })

    if (symbolsToFetch.length === 0) {
      return
    }

    // Fetch in batches
    const results = await fetchMultipleKlines(
      symbolsToFetch,
      interval,
      totalBars,
      5, // concurrency
      config.scanDelayMs
    )

    // Update cache for each symbol
    for (const [symbol, klines] of results) {
      queryClient.setQueryData(queryKeys.klines(symbol, interval), klines)
    }
  }

  return { prefetch }
}

/**
 * Get cached klines for a symbol (synchronous)
 */
export function useCachedKlines(symbol: string, interval: string = config.interval) {
  const queryClient = useQueryClient()
  return queryClient.getQueryData<BinanceKline[]>(queryKeys.klines(symbol, interval))
}
