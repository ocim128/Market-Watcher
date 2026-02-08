import { get24hrTickers } from '@/lib/binance'
import type { ConfluenceResult } from '@/types'

const STORAGE_KEY = 'market-watcher-mock-trades'
const MAX_STORED_TRADES = 500

export type MockTradeStatus = 'open' | 'closed'

export interface MockTradeMark {
  checkedAt: number
  longPrice: number
  shortPrice: number
  longLegPercent: number
  shortLegPercent: number
  combinedPercent: number
}

export interface MockTradeRecord {
  id: string
  createdAt: number
  status: MockTradeStatus
  entry: {
    primarySymbol: string
    secondarySymbol: string
    direction: 'long_spread' | 'short_spread'
    longSymbol: string
    shortSymbol: string
    longEntryPrice: number
    shortEntryPrice: number
    confluenceScore: number
    confidence: ConfluenceResult['confidence']
    alignedTimeframes: number
    totalTimeframes: number
    bestTimeframe: string | null
    intervals: string[]
    barsLoadedByInterval: Record<string, number>
    averageBarsLoaded: number
    configuredBars: number | null
  }
  latestMark: MockTradeMark | null
  exit: {
    closedAt: number
    longExitPrice: number
    shortExitPrice: number
    longLegPercent: number
    shortLegPercent: number
    combinedPercent: number
  } | null
}

function hasStorage(): boolean {
  return typeof window !== 'undefined'
}

function toFinite(value: number, fallback: number = 0): number {
  return Number.isFinite(value) ? value : fallback
}

function calculateLegPercents(
  longEntryPrice: number,
  shortEntryPrice: number,
  longPrice: number,
  shortPrice: number
): { longLegPercent: number; shortLegPercent: number; combinedPercent: number } {
  const longLegPercent = ((longPrice - longEntryPrice) / longEntryPrice) * 100
  const shortLegPercent = ((shortEntryPrice - shortPrice) / shortEntryPrice) * 100
  const combinedPercent = (longLegPercent + shortLegPercent) / 2

  return {
    longLegPercent: toFinite(longLegPercent),
    shortLegPercent: toFinite(shortLegPercent),
    combinedPercent: toFinite(combinedPercent),
  }
}

function splitByChunks<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    return [items]
  }
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize))
  }
  return chunks
}

async function fetchLatestPrices(symbols: string[]): Promise<Map<string, number>> {
  const uniqueSymbols = Array.from(new Set(symbols.filter(Boolean)))
  const priceMap = new Map<string, number>()
  const batches = splitByChunks(uniqueSymbols, 100)

  for (const batch of batches) {
    const tickers = await get24hrTickers(batch)
    for (const ticker of tickers) {
      const price = Number.parseFloat(ticker.lastPrice)
      if (Number.isFinite(price) && price > 0) {
        priceMap.set(ticker.symbol, price)
      }
    }
  }

  return priceMap
}

function persist(trades: MockTradeRecord[]): void {
  if (!hasStorage()) {
    return
  }
  const normalized = trades
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_STORED_TRADES)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
}

function buildBarsLoadedByInterval(result: ConfluenceResult): Record<string, number> {
  return result.timeframeAnalyses.reduce(
    (acc, analysis) => {
      acc[analysis.interval] = analysis.result.alignedBars
      return acc
    },
    {} as Record<string, number>
  )
}

export function loadMockTrades(): MockTradeRecord[] {
  if (!hasStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as MockTradeRecord[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
  } catch {
    return []
  }
}

export function clearMockTrades(): void {
  if (!hasStorage()) {
    return
  }
  window.localStorage.removeItem(STORAGE_KEY)
}

function createMarkFromPrices(
  trade: MockTradeRecord,
  longPrice: number,
  shortPrice: number,
  checkedAt: number
): MockTradeMark {
  const legs = calculateLegPercents(
    trade.entry.longEntryPrice,
    trade.entry.shortEntryPrice,
    longPrice,
    shortPrice
  )

  return {
    checkedAt,
    longPrice,
    shortPrice,
    longLegPercent: legs.longLegPercent,
    shortLegPercent: legs.shortLegPercent,
    combinedPercent: legs.combinedPercent,
  }
}

function buildTradeFromConfluence(
  result: ConfluenceResult,
  direction: 'long_spread' | 'short_spread',
  longEntryPrice: number,
  shortEntryPrice: number,
  configuredBars: number | null
): MockTradeRecord {
  const longSymbol = direction === 'long_spread' ? result.primarySymbol : result.symbol
  const shortSymbol = direction === 'long_spread' ? result.symbol : result.primarySymbol
  const now = Date.now()
  const barsLoadedByInterval = buildBarsLoadedByInterval(result)
  const barValues = Object.values(barsLoadedByInterval)
  const averageBarsLoaded =
    barValues.length > 0
      ? Math.round(barValues.reduce((sum, value) => sum + value, 0) / barValues.length)
      : 0

  const base: MockTradeRecord = {
    id: `mock_${now}_${result.primarySymbol}_${result.symbol}`,
    createdAt: now,
    status: 'open',
    entry: {
      primarySymbol: result.primarySymbol,
      secondarySymbol: result.symbol,
      direction,
      longSymbol,
      shortSymbol,
      longEntryPrice,
      shortEntryPrice,
      confluenceScore: result.confluenceScore,
      confidence: result.confidence,
      alignedTimeframes: result.alignedTimeframes,
      totalTimeframes: result.totalTimeframes,
      bestTimeframe: result.bestTimeframe,
      intervals: result.timeframeAnalyses.map(a => a.interval),
      barsLoadedByInterval,
      averageBarsLoaded,
      configuredBars,
    },
    latestMark: null,
    exit: null,
  }

  return {
    ...base,
    latestMark: createMarkFromPrices(base, longEntryPrice, shortEntryPrice, now),
  }
}

export async function openMockTrade(
  result: ConfluenceResult,
  options: { configuredBars?: number } = {}
): Promise<MockTradeRecord> {
  if (result.signalDirection === 'neutral') {
    throw new Error('Cannot open mock trade from neutral signal.')
  }

  const direction = result.signalDirection as 'long_spread' | 'short_spread'
  const longSymbol = direction === 'long_spread' ? result.primarySymbol : result.symbol
  const shortSymbol = direction === 'long_spread' ? result.symbol : result.primarySymbol
  const prices = await fetchLatestPrices([longSymbol, shortSymbol])
  const longEntryPrice = prices.get(longSymbol)
  const shortEntryPrice = prices.get(shortSymbol)

  if (!longEntryPrice || !shortEntryPrice) {
    throw new Error('Unable to fetch current prices for mock trade entry.')
  }

  const trade = buildTradeFromConfluence(
    result,
    direction,
    longEntryPrice,
    shortEntryPrice,
    options.configuredBars ?? null
  )
  const trades = [trade, ...loadMockTrades()]
  persist(trades)
  return trade
}

export async function refreshMockTrades(): Promise<MockTradeRecord[]> {
  const trades = loadMockTrades()
  const openTrades = trades.filter(trade => trade.status === 'open')
  if (openTrades.length === 0) {
    return trades
  }

  const symbolsToFetch = openTrades.flatMap(trade => [
    trade.entry.longSymbol,
    trade.entry.shortSymbol,
  ])
  const prices = await fetchLatestPrices(symbolsToFetch)
  const checkedAt = Date.now()

  const updated = trades.map(trade => {
    if (trade.status !== 'open') {
      return trade
    }
    const longPrice = prices.get(trade.entry.longSymbol)
    const shortPrice = prices.get(trade.entry.shortSymbol)
    if (!longPrice || !shortPrice) {
      return trade
    }
    return {
      ...trade,
      latestMark: createMarkFromPrices(trade, longPrice, shortPrice, checkedAt),
    }
  })

  persist(updated)
  return updated
}

export async function closeMockTrade(tradeId: string): Promise<MockTradeRecord | null> {
  const trades = loadMockTrades()
  const target = trades.find(trade => trade.id === tradeId)
  if (!target) {
    return null
  }
  if (target.status === 'closed') {
    return target
  }

  const prices = await fetchLatestPrices([target.entry.longSymbol, target.entry.shortSymbol])
  const longExitPrice = prices.get(target.entry.longSymbol)
  const shortExitPrice = prices.get(target.entry.shortSymbol)
  if (!longExitPrice || !shortExitPrice) {
    throw new Error('Unable to fetch latest prices to close mock trade.')
  }

  const closedAt = Date.now()
  const legs = calculateLegPercents(
    target.entry.longEntryPrice,
    target.entry.shortEntryPrice,
    longExitPrice,
    shortExitPrice
  )

  const updated = trades.map(trade => {
    if (trade.id !== tradeId) {
      return trade
    }
    return {
      ...trade,
      status: 'closed' as const,
      latestMark: createMarkFromPrices(trade, longExitPrice, shortExitPrice, closedAt),
      exit: {
        closedAt,
        longExitPrice,
        shortExitPrice,
        longLegPercent: legs.longLegPercent,
        shortLegPercent: legs.shortLegPercent,
        combinedPercent: legs.combinedPercent,
      },
    }
  })

  persist(updated)
  return updated.find(trade => trade.id === tradeId) ?? null
}
