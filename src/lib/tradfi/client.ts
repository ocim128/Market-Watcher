import type { BinanceKline } from '@/types'

const TRADFI_KLINE_PROXY_URL = '/api/tradfi-kline'
const MAX_LIMIT = 200

const INTERVAL_TO_TRADFI: Record<string, string> = {
  '1m': '1',
  '3m': '3',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1d': '1440',
}

const INTERVAL_TO_MS: Record<string, number> = {
  '1m': 60_000,
  '3m': 180_000,
  '5m': 300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
}

interface TradFiKlineResponse {
  ret_code: number
  ret_msg: string
  result?: {
    list?: string[][]
  }
}

function getTradFiInterval(interval: string): string {
  const mapped = INTERVAL_TO_TRADFI[interval]
  if (!mapped) {
    throw new Error(`Unsupported TradFi interval: ${interval}`)
  }
  return mapped
}

function getIntervalMs(interval: string): number {
  return INTERVAL_TO_MS[interval] || 60_000
}

function parseTradFiKline(raw: string[], interval: string): BinanceKline {
  const openTime = Number(raw[0] || 0)
  const closeTime = openTime + getIntervalMs(interval) - 1

  return {
    openTime,
    open: raw[1] || '0',
    high: raw[2] || '0',
    low: raw[3] || '0',
    close: raw[4] || '0',
    volume: '0',
    closeTime,
    quoteAssetVolume: '0',
    numberOfTrades: 0,
    takerBuyBaseVolume: '0',
    takerBuyQuoteVolume: '0',
  }
}

function sortAndDedupeKlines(klines: BinanceKline[]): BinanceKline[] {
  const map = new Map<number, BinanceKline>()
  for (const kline of klines) {
    map.set(kline.openTime, kline)
  }
  return Array.from(map.values()).sort((a, b) => a.openTime - b.openTime)
}

async function fetchTradFiKlineChunk(
  symbol: string,
  interval: string,
  limit: number,
  to?: number
): Promise<BinanceKline[]> {
  const params = new URLSearchParams({
    timeStamp: Date.now().toString(),
    symbol,
    interval: getTradFiInterval(interval),
    limit: Math.min(limit, MAX_LIMIT).toString(),
  })

  if (to && to > 0) {
    params.set('to', to.toString())
  }

  const response = await fetch(`${TRADFI_KLINE_PROXY_URL}?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`TradFi API error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as TradFiKlineResponse
  if (data.ret_code !== 0) {
    throw new Error(`TradFi API error: ${data.ret_msg}`)
  }

  const raw = data.result?.list || []
  const parsed = raw.map(item => parseTradFiKline(item, interval))
  return sortAndDedupeKlines(parsed)
}

export async function fetchTradFiKlinesPaged(
  symbol: string,
  interval: string,
  totalBars: number = 500,
  batchSize: number = MAX_LIMIT,
  delayMs: number = 100
): Promise<BinanceKline[]> {
  if (!symbol || !interval) {
    return []
  }

  const chunks: BinanceKline[][] = []
  let remaining = Math.max(0, totalBars)
  let to: number | undefined

  while (remaining > 0) {
    const chunk = await fetchTradFiKlineChunk(symbol, interval, Math.min(batchSize, remaining), to)
    if (chunk.length === 0) {
      break
    }

    chunks.push(chunk)
    remaining -= chunk.length

    const firstOpenTime = chunk[0]?.openTime
    if (!firstOpenTime || remaining <= 0) {
      break
    }

    to = firstOpenTime - 1

    if (delayMs > 0 && remaining > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  if (chunks.length === 0) {
    return []
  }

  return sortAndDedupeKlines(chunks.flat()).slice(-totalBars)
}

interface TradFiPairsResponse {
  pairs: string[]
}

export async function getTradFiPairs(limit?: number): Promise<string[]> {
  const response = await fetch('/api/tradfi-pairs', { cache: 'force-cache' })

  if (!response.ok) {
    throw new Error(`Failed to load TradFi pair list: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as TradFiPairsResponse
  const pairs = data.pairs || []

  if (!limit || limit <= 0) {
    return pairs
  }

  return pairs.slice(0, limit)
}
