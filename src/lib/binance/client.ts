import { config } from '@/config'
import type { BinanceKline, Binance24hrTicker, BinanceExchangeInfo } from '@/types'
import { resolveFetchInterval, resampleKlines, calculateRequiredBars } from './resample'

const BINANCE_BASE_URL = config.binanceBaseUrl

/**
 * Parse raw Binance kline array to typed object
 */
export function parseKline(raw: unknown[]): BinanceKline {
  return {
    openTime: raw[0] as number,
    open: raw[1] as string,
    high: raw[2] as string,
    low: raw[3] as string,
    close: raw[4] as string,
    volume: raw[5] as string,
    closeTime: raw[6] as number,
    quoteAssetVolume: raw[7] as string,
    numberOfTrades: raw[8] as number,
    takerBuyBaseVolume: raw[9] as string,
    takerBuyQuoteVolume: raw[10] as string,
  }
}

/**
 * Extract close prices from klines
 */
export function extractClosePrices(klines: BinanceKline[]): number[] {
  return klines.map(k => parseFloat(k.close))
}

/**
 * Fetch klines from Binance API
 * @param symbol - Trading pair symbol (e.g., "ETHUSDT")
 * @param interval - Kline interval (e.g., "1h", "4h", "1d")
 * @param limit - Number of klines to fetch (max 1000)
 * @param endTime - Optional end time in milliseconds
 */
export async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number = 1000,
  endTime?: number
): Promise<BinanceKline[]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: Math.min(limit, 1000).toString(),
  })

  if (endTime && endTime > 0) {
    params.set('endTime', endTime.toString())
  }

  const url = `${BINANCE_BASE_URL}/api/v3/klines?${params.toString()}`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  })

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.map(parseKline)
}

/**
 * Fetch klines with pagination to exceed the 1000 bar limit
 * Ports logic from .NET BinanceClient.FetchKlinesPaged
 *
 * @param symbol - Trading pair symbol
 * @param interval - Kline interval
 * @param totalBars - Total number of bars to fetch
 * @param batchSize - Bars per request (max 1000)
 * @param delayMs - Delay between requests to avoid rate limiting
 * @param onProgress - Optional progress callback
 */
export async function fetchKlinesPaged(
  symbol: string,
  interval: string,
  totalBars: number = 500,
  batchSize: number = 1000,
  delayMs: number = 100,
  onProgress?: (fetched: number, total: number) => void
): Promise<BinanceKline[]> {
  if (!symbol || !interval) {
    console.warn('Symbol or interval is empty')
    return []
  }

  let remaining = Math.max(0, totalBars)
  if (remaining === 0) {
    return []
  }

  const limit = Math.min(Math.max(1, batchSize), 1000)
  let endTime: number | undefined = undefined
  const chunks: BinanceKline[][] = []
  let fetched = 0

  while (remaining > 0) {
    const requestLimit = Math.min(limit, remaining)

    try {
      const chunk = await fetchKlines(symbol, interval, requestLimit, endTime)

      if (chunk.length === 0) {
        console.info(`No more klines returned for ${symbol}`)
        break
      }

      chunks.push(chunk)
      fetched += chunk.length
      remaining -= chunk.length

      onProgress?.(fetched, totalBars)

      if (remaining <= 0) {
        break
      }

      // Set endTime to before the first candle of this chunk for next request
      const firstOpenTime = chunk[0]?.openTime
      if (firstOpenTime && firstOpenTime > 0) {
        endTime = firstOpenTime - 1
      } else {
        break
      }

      // Rate limiting delay
      if (delayMs > 0 && remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    } catch (error) {
      console.error(`Failed to fetch klines for ${symbol}:`, error)
      break
    }
  }

  if (chunks.length === 0) {
    return []
  }

  // Reverse chunks (we fetched backwards in time) and flatten
  chunks.reverse()
  return chunks.flat()
}

/**
 * Smart fetch with automatic resampling for custom intervals
 *
 * For native Binance intervals (1m, 3m, 5m, etc.), fetches directly.
 * For custom intervals (2m, 7m, 10m, etc.), fetches 1m and resamples.
 *
 * @param symbol - Trading pair symbol
 * @param interval - Target interval (native like "5m" or custom like "7m")
 * @param totalBars - Number of target bars to return
 * @param batchSize - Bars per request
 * @param delayMs - Delay between requests
 */
export async function fetchKlinesSmart(
  symbol: string,
  interval: string,
  totalBars: number = 200,
  batchSize: number = 1000,
  delayMs: number = 100,
  onProgress?: (fetched: number, total: number) => void
): Promise<BinanceKline[]> {
  const { sourceInterval, needsResample } = resolveFetchInterval(interval)

  if (!needsResample) {
    // Native interval - fetch directly
    return fetchKlinesPaged(symbol, interval, totalBars, batchSize, delayMs, onProgress)
  }

  // Custom interval - need to fetch more source bars and resample
  const requiredBars = calculateRequiredBars(totalBars, interval, sourceInterval)

  console.info(
    `[Resample] Fetching ${requiredBars} ${sourceInterval} bars to create ${totalBars} ${interval} bars`
  )

  const sourceKlines = await fetchKlinesPaged(
    symbol,
    sourceInterval,
    requiredBars,
    batchSize,
    delayMs,
    onProgress
  )

  if (sourceKlines.length === 0) {
    return []
  }

  // Resample to target interval
  const resampled = resampleKlines(sourceKlines, interval)

  console.info(
    `[Resample] ${symbol} ${interval}: ${sourceKlines.length} ${sourceInterval} -> ${resampled.length} ${interval}`
  )

  // Return exactly the requested number of bars (most recent)
  return resampled.slice(-totalBars)
}

/**
 * Get exchange info with all available symbols
 */
export async function getExchangeInfo(): Promise<BinanceExchangeInfo> {
  const url = `${BINANCE_BASE_URL}/api/v3/exchangeInfo`

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  })

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get 24hr ticker data for all symbols or specific symbols
 */
export async function get24hrTickers(symbols?: string[]): Promise<Binance24hrTicker[]> {
  let url = `${BINANCE_BASE_URL}/api/v3/ticker/24hr`

  if (symbols && symbols.length > 0 && symbols.length <= 100) {
    // Use symbols parameter for small batches
    const symbolsParam = JSON.stringify(symbols)
    url += `?symbols=${encodeURIComponent(symbolsParam)}`
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  })

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get top USDT pairs by 24hr quote volume
 * @param limit - Number of pairs to return
 * @param excludeSymbols - Symbols to exclude (e.g., stablecoins)
 */
export async function getTopUsdtPairs(
  limit: number = 120,
  excludeSymbols: string[] = [
    'USDCUSDT',
    'BUSDUSDT',
    'TUSDUSDT',
    'FDUSDUSDT',
    'EURUSDT',
    'USDPUSDT',
  ]
): Promise<string[]> {
  const tickers = await get24hrTickers()

  // Filter to USDT pairs only and exclude stablecoins
  const usdtTickers = tickers.filter(
    t =>
      t.symbol.endsWith('USDT') &&
      !excludeSymbols.includes(t.symbol) &&
      parseFloat(t.quoteVolume) > 0
  )

  // Sort by 24hr quote volume (descending)
  usdtTickers.sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))

  // Return top N symbols
  return usdtTickers.slice(0, limit).map(t => t.symbol)
}

/**
 * Fetch klines for multiple symbols in parallel with concurrency limit
 */
export async function fetchMultipleKlines(
  symbols: string[],
  interval: string,
  totalBars: number = 500,
  concurrency: number = 5,
  delayMs: number = 100,
  onProgress?: (completed: number, total: number, currentSymbol: string) => void
): Promise<Map<string, BinanceKline[]>> {
  const results = new Map<string, BinanceKline[]>()
  let completed = 0

  // Process in batches with concurrency limit
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency)

    const batchResults = await Promise.allSettled(
      batch.map(async symbol => {
        const klines = await fetchKlinesPaged(symbol, interval, totalBars, 1000, 0)
        return { symbol, klines }
      })
    )

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.set(result.value.symbol, result.value.klines)
      }
      completed++
      onProgress?.(completed, symbols.length, batch[0] || '')
    }

    // Delay between batches to avoid rate limiting
    if (i + concurrency < symbols.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return results
}
