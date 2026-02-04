'use client'

import { useState, useCallback } from 'react'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { config } from '@/config'
import { getTopUsdtPairs, fetchKlinesPaged, extractClosePrices } from '@/lib/binance'
import { queryKeys } from './use-binance-data'
import type { ScanProgress, BinanceKline } from '@/types'

export interface ScanResult {
  symbol: string
  klines: BinanceKline[]
  closePrices: number[]
}

async function fetchSymbolData(
  symbol: string,
  interval: string,
  totalBars: number,
  queryClient: QueryClient
): Promise<ScanResult> {
  const cached = queryClient.getQueryData<BinanceKline[]>(queryKeys.klines(symbol, interval))

  if (cached && cached.length > 0) {
    return { symbol, klines: cached, closePrices: extractClosePrices(cached) }
  }

  const klines = await fetchKlinesPaged(symbol, interval, totalBars, 1000, 0)
  queryClient.setQueryData(queryKeys.klines(symbol, interval), klines)
  return { symbol, klines, closePrices: extractClosePrices(klines) }
}

async function processBatch(
  batch: string[],
  interval: string,
  totalBars: number,
  queryClient: QueryClient,
  scanResults: ScanResult[]
): Promise<void> {
  const batchPromises = batch.map(symbol =>
    fetchSymbolData(symbol, interval, totalBars, queryClient)
  )
  const batchResults = await Promise.allSettled(batchPromises)

  for (const result of batchResults) {
    if (result.status === 'fulfilled' && result.value.klines.length > 0) {
      scanResults.push(result.value)
    }
  }
}

export function usePairScan() {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<ScanProgress>({
    current: 0,
    total: 0,
    currentSymbol: '',
    status: 'idle',
  })
  const [results, setResults] = useState<ScanResult[]>([])

  const scan = useCallback(
    async (
      options: {
        limit?: number
        interval?: string
        totalBars?: number
        concurrency?: number
        includePrimary?: boolean
      } = {}
    ) => {
      const {
        limit = config.topPairsLimit,
        interval = config.interval,
        totalBars = config.totalBars,
        concurrency = 5,
        includePrimary = true,
      } = options

      setProgress({ current: 0, total: 0, currentSymbol: 'Fetching pairs...', status: 'scanning' })
      setResults([])

      try {
        let pairs = await getTopUsdtPairs(limit)
        pairs = pairs.filter(p => p !== config.primaryPair)
        const allSymbols = includePrimary ? [config.primaryPair, ...pairs] : pairs

        setProgress({
          current: 0,
          total: allSymbols.length,
          currentSymbol: config.primaryPair,
          status: 'scanning',
        })

        const scanResults: ScanResult[] = []

        for (let i = 0; i < allSymbols.length; i += concurrency) {
          const batch = allSymbols.slice(i, i + concurrency)
          await processBatch(batch, interval, totalBars, queryClient, scanResults)

          const completed = Math.min(i + concurrency, allSymbols.length)
          setProgress({
            current: completed,
            total: allSymbols.length,
            currentSymbol: batch[batch.length - 1] || '',
            status: 'scanning',
          })

          if (i + concurrency < allSymbols.length) {
            await new Promise(resolve => setTimeout(resolve, config.scanDelayMs))
          }
        }

        setResults(scanResults)
        setProgress({
          current: allSymbols.length,
          total: allSymbols.length,
          currentSymbol: '',
          status: 'complete',
        })
        return scanResults
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setProgress(prev => ({ ...prev, status: 'error', error: errorMessage }))
        throw error
      }
    },
    [queryClient]
  )

  const reset = useCallback(() => {
    setProgress({ current: 0, total: 0, currentSymbol: '', status: 'idle' })
    setResults([])
  }, [])

  return {
    scan,
    reset,
    progress,
    results,
    isScanning: progress.status === 'scanning',
    isComplete: progress.status === 'complete',
    isError: progress.status === 'error',
  }
}
