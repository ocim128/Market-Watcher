/**
 * Scan Service - Core scanning logic
 *
 * This module contains the business logic for scanning pairs from supported exchanges.
 * It's separated from the store to allow dependency injection (e.g., queryClient).
 */

import { config, type ExchangeType } from '@/config'
import { getTopUsdtPairs, fetchKlinesPaged, extractClosePrices } from '@/lib/binance'
import { getTradFiPairs, fetchTradFiKlinesPaged } from '@/lib/tradfi'
import { analyzePair } from '@/lib/analysis'
import { saveSnapshot } from '@/lib/history/tracking'
import { queryKeys } from '@/hooks/use-binance-data'
import type { QueryClient } from '@tanstack/react-query'
import type { BinanceKline, PairAnalysisResult } from '@/types'
import type { ScanOptions, ScanResult } from '../store/scan-store'

/**
 * Fetch klines for a symbol, using cache if available
 */
async function fetchWithCache(
  exchange: ExchangeType,
  symbol: string,
  interval: string,
  totalBars: number,
  queryClient: QueryClient
): Promise<ScanResult> {
  // Check cache first
  const cached = queryClient.getQueryData<BinanceKline[]>(
    queryKeys.klines(symbol, interval, exchange)
  )

  if (cached && cached.length > 0) {
    return {
      symbol,
      klines: cached,
      closePrices: extractClosePrices(cached),
    }
  }

  // Fetch from API
  const klines =
    exchange === 'tradfi'
      ? await fetchTradFiKlinesPaged(symbol, interval, totalBars, 200, 0)
      : await fetchKlinesPaged(symbol, interval, totalBars, 1000, 0)
  queryClient.setQueryData(queryKeys.klines(symbol, interval, exchange), klines)

  return {
    symbol,
    klines,
    closePrices: extractClosePrices(klines),
  }
}

/**
 * Analyze scan results against a primary pair
 */
export function analyzeScanResults(
  scanResults: ScanResult[],
  primaryPair: string
): PairAnalysisResult[] {
  const primaryResult = scanResults.find(r => r.symbol === primaryPair)
  if (!primaryResult || primaryResult.closePrices.length === 0) {
    console.warn('Primary pair data not found')
    return []
  }

  const primaryCloses = primaryResult.closePrices
  const otherPairs = scanResults.filter(r => r.symbol !== primaryPair)

  const analyzed: PairAnalysisResult[] = []
  for (const pair of otherPairs) {
    if (pair.closePrices.length > 0) {
      const result = analyzePair(primaryCloses, pair.closePrices, pair.symbol, primaryPair)
      analyzed.push(result)
    }
  }

  // Sort by opportunity score (highest first)
  analyzed.sort((a, b) => b.opportunityScore - a.opportunityScore)
  return analyzed
}

/**
 * Save scan results to history
 */
export function saveToHistory(
  scanResults: ScanResult[],
  primaryPair: string,
  interval: string
): void {
  const currentResults = scanResults
    .filter(r => r.symbol !== primaryPair)
    .map(r => {
      const primaryResult = scanResults.find(s => s.symbol === primaryPair)
      if (!primaryResult) {
        return null
      }
      return analyzePair(primaryResult.closePrices, r.closePrices, r.symbol, primaryPair)
    })
    .filter((r): r is PairAnalysisResult => r !== null)

  if (currentResults.length > 0) {
    saveSnapshot(currentResults, primaryPair, interval)
  }
}

async function processScanBatch(
  exchange: ExchangeType,
  batch: string[],
  interval: string,
  totalBars: number,
  queryClient: QueryClient,
  scanResults: ScanResult[]
): Promise<void> {
  const batchPromises = batch.map(symbol =>
    fetchWithCache(exchange, symbol, interval, totalBars, queryClient)
  )
  const batchResults = await Promise.allSettled(batchPromises)

  for (const result of batchResults) {
    if (result.status === 'fulfilled' && result.value.klines.length > 0) {
      scanResults.push(result.value)
    }
  }
}

interface ScanExecutionParams {
  limit?: number
  interval: string
  totalBars: number
  primaryPair: string
  exchange: ExchangeType
  concurrency: number
  includePrimary: boolean
}

async function getScanSymbols(params: ScanExecutionParams): Promise<string[]> {
  const pairs =
    params.exchange === 'tradfi'
      ? await getTradFiPairs(params.limit)
      : await getTopUsdtPairs(params.limit)
  const filteredPairs = pairs.filter(p => p !== params.primaryPair)
  return params.includePrimary ? [params.primaryPair, ...filteredPairs] : filteredPairs
}

function scheduleHistorySave(
  scanResults: ScanResult[],
  primaryPair: string,
  interval: string
): void {
  setTimeout(() => saveToHistory(scanResults, primaryPair, interval), 600)
}

function normalizeScanOptions(options: ScanOptions): ScanExecutionParams {
  const exchange = options.exchange ?? config.exchange
  const defaultLimit = exchange === 'tradfi' ? undefined : config.topPairsLimit

  return {
    limit: options.limit ?? defaultLimit,
    interval: options.interval ?? config.interval,
    totalBars: options.totalBars ?? config.totalBars,
    primaryPair: options.primaryPair ?? config.primaryPair,
    exchange,
    concurrency: options.concurrency ?? 5,
    includePrimary: options.includePrimary ?? true,
  }
}

export async function executeScan(
  options: ScanOptions,
  queryClient: QueryClient,
  onProgress: (current: number, total: number, currentSymbol: string) => void
): Promise<{ results: ScanResult[]; error?: string }> {
  const params = normalizeScanOptions(options)

  try {
    const allSymbols = await getScanSymbols(params)
    onProgress(0, allSymbols.length, params.primaryPair)

    const scanResults: ScanResult[] = []

    for (let i = 0; i < allSymbols.length; i += params.concurrency) {
      const batch = allSymbols.slice(i, i + params.concurrency)
      await processScanBatch(
        params.exchange,
        batch,
        params.interval,
        params.totalBars,
        queryClient,
        scanResults
      )

      const completed = Math.min(i + params.concurrency, allSymbols.length)
      onProgress(completed, allSymbols.length, batch[batch.length - 1] || '')

      if (i + params.concurrency < allSymbols.length) {
        await new Promise(resolve => setTimeout(resolve, config.scanDelayMs))
      }
    }

    if (options.autoAnalyze !== false && scanResults.length > 0) {
      scheduleHistorySave(scanResults, params.primaryPair, params.interval)
    }

    return { results: scanResults }
  } catch (error) {
    return { results: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
