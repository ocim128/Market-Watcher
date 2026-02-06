/**
 * Scan Service - Core scanning logic
 *
 * This module contains the business logic for scanning pairs from supported exchanges.
 * It's separated from the store to allow dependency injection (e.g., queryClient).
 */

import { config, type ExchangeType, type ScanMode } from '@/config'
import { getTopUsdtPairs, fetchKlinesPaged, extractClosePrices } from '@/lib/binance'
import { getTradFiPairs, fetchTradFiKlinesPaged } from '@/lib/tradfi'
import { analyzePair } from '@/lib/analysis'
import { calculateReturns, pearsonCorrelation } from '@/lib/analysis/statistics'
import { loadHistory, saveSnapshot } from '@/lib/history/tracking'
import { buildReversionModel } from '@/lib/history/reversion-probability'
import { queryKeys } from '@/hooks/use-binance-data'
import type { QueryClient } from '@tanstack/react-query'
import type { BinanceKline, PairAnalysisResult } from '@/types'
import type { ScanOptions, ScanResult } from '../store/scan-store'

const ALL_PAIRS_PRIMARY = 'ALL_PAIRS'
const ALL_VS_ALL_MIN_CORRELATION = 0.35
const ALL_VS_ALL_MAX_CANDIDATES = 2500

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

function applyProbabilityScoring(
  analyzed: PairAnalysisResult[],
  interval: string,
  scanMode: ScanMode,
  primaryPair: string
): PairAnalysisResult[] {
  if (analyzed.length === 0) {
    return []
  }

  const history = loadHistory()
  const modelPrimary = scanMode === 'all_vs_all' ? ALL_PAIRS_PRIMARY : primaryPair
  const model = buildReversionModel(history, modelPrimary, interval)

  const rescored = analyzed.map(result => {
    const estimate = model.estimate(result)
    const tradable = result.stationarity.isTradable
    const probability = estimate?.probability ?? result.reversionProbability.probability
    const lookaheadBars = estimate?.lookaheadBars ?? result.reversionProbability.lookaheadBars
    const sampleSize = estimate?.sampleSize ?? result.reversionProbability.sampleSize
    const wins = estimate?.wins ?? result.reversionProbability.wins
    const method = estimate ? 'history' : result.reversionProbability.method

    const opportunityScore = tradable ? Math.round(probability * 100) : 0
    const probabilityLabel = `${Math.round(probability * 100)}% reversion in ${lookaheadBars} bars`
    const notes = [...result.notes]
    if (estimate) {
      notes.push(`Historical edge: ${probabilityLabel} (${wins}/${sampleSize} labeled samples).`)
    } else {
      notes.push(`Estimated edge (fallback): ${probabilityLabel}.`)
    }

    return {
      ...result,
      opportunityScore,
      reversionProbability: {
        probability,
        lookaheadBars,
        sampleSize,
        wins,
        method,
      },
      notes,
    }
  })

  rescored.sort((a, b) => b.opportunityScore - a.opportunityScore)
  return rescored
}

function analyzePrimaryVsAllScanResults(
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
    if (pair.closePrices.length === 0) {
      continue
    }
    const result = analyzePair(primaryCloses, pair.closePrices, pair.symbol, primaryPair)
    analyzed.push(result)
  }

  return analyzed
}

interface PairCandidate {
  first: ScanResult
  second: ScanResult
  absCorrelation: number
}

function buildAllVsAllCandidates(scanResults: ScanResult[]): PairCandidate[] {
  const returnsMap = new Map<string, number[]>()
  for (const result of scanResults) {
    returnsMap.set(result.symbol, calculateReturns(result.closePrices))
  }

  const candidates: PairCandidate[] = []
  for (let i = 0; i < scanResults.length; i++) {
    for (let j = i + 1; j < scanResults.length; j++) {
      const first = scanResults[i]
      const second = scanResults[j]
      const firstReturns = returnsMap.get(first.symbol) ?? []
      const secondReturns = returnsMap.get(second.symbol) ?? []
      const quickCorr = pearsonCorrelation(firstReturns, secondReturns)
      const absCorrelation = Math.abs(quickCorr)
      if (absCorrelation < ALL_VS_ALL_MIN_CORRELATION) {
        continue
      }
      candidates.push({ first, second, absCorrelation })
    }
  }

  return candidates
    .sort((a, b) => b.absCorrelation - a.absCorrelation)
    .slice(0, ALL_VS_ALL_MAX_CANDIDATES)
}

function analyzeAllVsAllScanResults(scanResults: ScanResult[]): PairAnalysisResult[] {
  const candidates = buildAllVsAllCandidates(scanResults)
  const analyzed: PairAnalysisResult[] = []

  for (const candidate of candidates) {
    if (candidate.first.closePrices.length === 0 || candidate.second.closePrices.length === 0) {
      continue
    }
    analyzed.push(
      analyzePair(
        candidate.first.closePrices,
        candidate.second.closePrices,
        candidate.second.symbol,
        candidate.first.symbol
      )
    )
  }

  return analyzed
}

/**
 * Analyze scan results for selected scan mode
 */
export function analyzeScanResults(
  scanResults: ScanResult[],
  primaryPair: string,
  interval: string,
  scanMode: ScanMode = config.scanMode
): PairAnalysisResult[] {
  const analyzed =
    scanMode === 'all_vs_all'
      ? analyzeAllVsAllScanResults(scanResults)
      : analyzePrimaryVsAllScanResults(scanResults, primaryPair)

  return applyProbabilityScoring(analyzed, interval, scanMode, primaryPair)
}

/**
 * Save scan results to history
 */
export function saveToHistory(
  scanResults: ScanResult[],
  primaryPair: string,
  interval: string,
  scanMode: ScanMode
): void {
  const currentResults = analyzeScanResults(scanResults, primaryPair, interval, scanMode)
  const snapshotPrimaryPair = scanMode === 'all_vs_all' ? ALL_PAIRS_PRIMARY : primaryPair

  if (currentResults.length > 0) {
    saveSnapshot(currentResults, snapshotPrimaryPair, interval)
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
  scanMode: ScanMode
  exchange: ExchangeType
  concurrency: number
  includePrimary: boolean
}

async function getScanSymbols(params: ScanExecutionParams): Promise<string[]> {
  const pairs =
    params.exchange === 'tradfi'
      ? await getTradFiPairs(params.limit)
      : await getTopUsdtPairs(params.limit)
  if (params.scanMode === 'all_vs_all') {
    return pairs
  }
  const filteredPairs = pairs.filter(p => p !== params.primaryPair)
  return params.includePrimary ? [params.primaryPair, ...filteredPairs] : filteredPairs
}

function scheduleHistorySave(
  scanResults: ScanResult[],
  primaryPair: string,
  interval: string,
  scanMode: ScanMode
): void {
  setTimeout(() => saveToHistory(scanResults, primaryPair, interval, scanMode), 600)
}

function normalizeScanOptions(options: ScanOptions): ScanExecutionParams {
  const exchange = options.exchange ?? config.exchange
  const defaultLimit = exchange === 'tradfi' ? undefined : config.topPairsLimit

  return {
    limit: options.limit ?? defaultLimit,
    interval: options.interval ?? config.interval,
    totalBars: options.totalBars ?? config.totalBars,
    primaryPair: options.primaryPair ?? config.primaryPair,
    scanMode: options.scanMode ?? config.scanMode,
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
    onProgress(
      0,
      allSymbols.length,
      params.scanMode === 'all_vs_all' ? 'All-vs-All Universe' : params.primaryPair
    )

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
      scheduleHistorySave(scanResults, params.primaryPair, params.interval, params.scanMode)
    }

    return { results: scanResults }
  } catch (error) {
    return { results: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
