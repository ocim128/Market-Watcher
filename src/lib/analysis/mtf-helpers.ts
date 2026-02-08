import { type QueryClient } from '@tanstack/react-query'
import { config, type ScanMode } from '@/config'
import { fetchKlinesSmart, extractClosePrices, getTopUsdtPairs } from '@/lib/binance'
import {
  analyzeMultiTimeframeConfluence,
  type ConfluenceResult,
} from '@/lib/analysis/multi-timeframe'
import { buildAllVsAllCandidates } from '@/lib/analysis/all-vs-all-candidates'
import { createReversionScorer, type ReversionScorer } from '@/lib/analysis/reversion-scoring'
import { loadHistory } from '@/lib/history/tracking'
import { resolveFetchInterval } from '@/lib/binance/resample'
import { queryKeys } from '@/hooks/use-binance-data'
import type { BinanceKline } from '@/types'

const NATIVE_INTERVALS = [
  '1m',
  '3m',
  '5m',
  '15m',
  '30m',
  '1h',
  '2h',
  '4h',
  '6h',
  '8h',
  '12h',
  '1d',
  '3d',
  '1w',
  '1M',
]

/**
 * Clear cache for custom intervals to ensure fresh data
 */
export function clearCustomIntervalCache(queryClient: QueryClient): void {
  const allCacheKeys = queryClient.getQueryCache().getAll()
  allCacheKeys.forEach(query => {
    const key = query.queryKey
    if (Array.isArray(key) && key[1] === 'klines') {
      const interval = key[3] as string
      if (interval && !NATIVE_INTERVALS.includes(interval)) {
        queryClient.removeQueries({ queryKey: key })
      }
    }
  })
}

/**
 * Fetch a single interval for a symbol (with cache check)
 */
export async function fetchIntervalData(
  symbol: string,
  interval: string,
  totalBars: number,
  queryClient: QueryClient
): Promise<{ interval: string; closePrices: number[] } | null> {
  const cached = queryClient.getQueryData<BinanceKline[]>(queryKeys.klines(symbol, interval))

  if (cached && cached.length > 0) {
    return { interval, closePrices: extractClosePrices(cached) }
  }

  const klines = await fetchKlinesSmart(symbol, interval, totalBars, 1000, 0)
  queryClient.setQueryData(queryKeys.klines(symbol, interval), klines)

  if (klines.length === 0) {
    return null
  }

  return { interval, closePrices: extractClosePrices(klines) }
}

/**
 * Fetch all intervals for a symbol in PARALLEL
 */
export async function fetchSymbolAllIntervals(
  symbol: string,
  intervals: string[],
  totalBars: number,
  queryClient: QueryClient
): Promise<Map<string, number[]>> {
  const intervalData = new Map<string, number[]>()

  // Fetch all intervals in parallel
  const results = await Promise.allSettled(
    intervals.map(interval => fetchIntervalData(symbol, interval, totalBars, queryClient))
  )

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      intervalData.set(result.value.interval, result.value.closePrices)
    }
  }

  return intervalData
}

/**
 * Process a batch of symbols - fetch all intervals for each symbol in parallel
 */
export async function processSymbolBatch(
  batch: string[],
  intervals: string[],
  totalBars: number,
  queryClient: QueryClient,
  symbolIntervalData: Map<string, Map<string, number[]>>,
  onProgress: (completed: number, currentSymbol: string) => void
): Promise<void> {
  // Fetch all symbols in the batch in parallel
  const batchPromises = batch.map(symbol =>
    fetchSymbolAllIntervals(symbol, intervals, totalBars, queryClient)
  )

  const batchResults = await Promise.allSettled(batchPromises)

  batch.forEach((symbol, index) => {
    const result = batchResults[index]
    if (result.status === 'fulfilled' && result.value.size > 0) {
      symbolIntervalData.set(symbol, result.value)
    }
    onProgress(1, symbol)
  })
}

/**
 * Analyze confluence for all pairs using pre-fetched data
 */
export function analyzeConfluenceForPairs(
  pairs: string[],
  symbolIntervalData: Map<string, Map<string, number[]>>,
  primaryPair: string,
  intervals: string[],
  scanMode: ScanMode,
  reversionScorersByInterval: Map<string, ReversionScorer>
): ConfluenceResult[] {
  const primaryIntervalData = symbolIntervalData.get(primaryPair)
  if (!primaryIntervalData) {
    throw new Error('Primary pair data not found')
  }

  const confluenceResults: ConfluenceResult[] = []

  for (const symbol of pairs) {
    const pairIntervalData = symbolIntervalData.get(symbol)
    if (!pairIntervalData) {
      continue
    }

    const timeframeData = new Map<string, { primary: number[]; secondary: number[] }>()

    for (const interval of intervals) {
      const primaryPrices = primaryIntervalData.get(interval)
      const secondaryPrices = pairIntervalData.get(interval)

      if (primaryPrices?.length && secondaryPrices?.length) {
        timeframeData.set(interval, { primary: primaryPrices, secondary: secondaryPrices })
      }
    }

    if (timeframeData.size > 0) {
      const confluence = analyzeMultiTimeframeConfluence(timeframeData, symbol, primaryPair, {
        intervals,
        scanMode,
        reversionScorersByInterval,
      })
      confluenceResults.push(confluence)
    }
  }

  confluenceResults.sort((a, b) => b.confluenceScore - a.confluenceScore)
  return confluenceResults
}

function analyzeConfluenceForAllVsAll(
  symbolIntervalData: Map<string, Map<string, number[]>>,
  intervals: string[],
  reversionScorersByInterval: Map<string, ReversionScorer>
): ConfluenceResult[] {
  const anchorInterval = intervals[0]
  const series = Array.from(symbolIntervalData.entries())
    .map(([symbol, intervalData]) => ({
      symbol,
      closePrices: intervalData.get(anchorInterval) ?? [],
    }))
    .filter(item => item.closePrices.length > 1)

  const candidates = buildAllVsAllCandidates(series)
  const confluenceResults: ConfluenceResult[] = []

  for (const candidate of candidates) {
    const firstIntervalData = symbolIntervalData.get(candidate.first.symbol)
    const secondIntervalData = symbolIntervalData.get(candidate.second.symbol)
    if (!firstIntervalData || !secondIntervalData) {
      continue
    }

    const timeframeData = new Map<string, { primary: number[]; secondary: number[] }>()
    for (const interval of intervals) {
      const firstPrices = firstIntervalData.get(interval)
      const secondPrices = secondIntervalData.get(interval)
      if (firstPrices?.length && secondPrices?.length) {
        timeframeData.set(interval, { primary: firstPrices, secondary: secondPrices })
      }
    }

    if (timeframeData.size === 0) {
      continue
    }

    confluenceResults.push(
      analyzeMultiTimeframeConfluence(
        timeframeData,
        candidate.second.symbol,
        candidate.first.symbol,
        {
          intervals,
          scanMode: 'all_vs_all',
          reversionScorersByInterval,
        }
      )
    )
  }

  confluenceResults.sort((a, b) => b.confluenceScore - a.confluenceScore)
  return confluenceResults
}

/**
 * Check if an interval needs to be fetched (not in cache or custom)
 */
export function needsFetch(symbol: string, interval: string, queryClient: QueryClient): boolean {
  const cached = queryClient.getQueryData<BinanceKline[]>(queryKeys.klines(symbol, interval))
  if (!cached || cached.length === 0) {
    return true
  }

  // Custom intervals always need refresh
  const { needsResample } = resolveFetchInterval(interval)
  return needsResample
}

/**
 * Calculate minimum delay based on how much data needs fetching
 */
export function calculateDelay(
  symbols: string[],
  intervals: string[],
  queryClient: QueryClient
): number {
  let needsFetchCount = 0
  for (const symbol of symbols) {
    for (const interval of intervals) {
      if (needsFetch(symbol, interval, queryClient)) {
        needsFetchCount++
      }
    }
  }

  // If mostly cached, use minimal delay
  if (needsFetchCount === 0) {
    return 0
  }

  // Scale delay based on fetch load
  const fetchRatio = needsFetchCount / (symbols.length * intervals.length)
  if (fetchRatio < 0.3) {
    return 10 // Mostly cached
  }
  if (fetchRatio < 0.7) {
    return 25 // Mixed
  }
  return config.scanDelayMs // Full fetch
}
/**
 * Perform the actual MTF scan orchestral logic
 */
export async function performMtfScan(
  options: {
    limit: number
    intervals: string[]
    totalBars: number
    primaryPair: string
    scanMode: ScanMode
    concurrency: number
  },
  queryClient: QueryClient,
  onProgressUpdate: (completedCount: number, currentSymbol: string, totalSymbols: number) => void
): Promise<ConfluenceResult[]> {
  const { limit, intervals, totalBars, primaryPair, scanMode, concurrency } = options

  clearCustomIntervalCache(queryClient)

  // Fetch pairs
  const allPairs = await getTopUsdtPairs(limit)
  const pairs = allPairs.filter(p => p !== primaryPair)
  const allSymbols = scanMode === 'all_vs_all' ? allPairs : [primaryPair, ...pairs]

  const symbolIntervalData = new Map<string, Map<string, number[]>>()
  let totalCompleted = 0

  // Process symbols in batches for parallel fetching
  for (let i = 0; i < allSymbols.length; i += concurrency) {
    const batch = allSymbols.slice(i, i + concurrency)

    await processSymbolBatch(
      batch,
      intervals,
      totalBars,
      queryClient,
      symbolIntervalData,
      (batchCompleted, currentSymbol) => {
        totalCompleted += batchCompleted
        onProgressUpdate(totalCompleted, currentSymbol, allSymbols.length)
      }
    )

    // Adaptive delay between batches
    if (i + concurrency < allSymbols.length) {
      const delay = calculateDelay(batch, intervals, queryClient)
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  const history = loadHistory()
  const reversionScorersByInterval = new Map<string, ReversionScorer>()
  for (const interval of intervals) {
    reversionScorersByInterval.set(
      interval,
      createReversionScorer({
        interval,
        scanMode,
        primaryPair,
        history,
      })
    )
  }

  if (scanMode === 'all_vs_all') {
    return analyzeConfluenceForAllVsAll(symbolIntervalData, intervals, reversionScorersByInterval)
  }
  return analyzeConfluenceForPairs(
    pairs,
    symbolIntervalData,
    primaryPair,
    intervals,
    scanMode,
    reversionScorersByInterval
  )
}
