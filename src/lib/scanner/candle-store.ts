import type { BinanceKline } from '@/types'
import type { CandleStoreLike } from './types'

const DB_NAME = 'market-watcher-candles'
const DB_VERSION = 1
const STORE_NAME = 'candles'
const INDEX_SYMBOL_INTERVAL = 'symbolInterval'
const INDEX_SYMBOL_INTERVAL_OPEN_TIME = 'symbolIntervalOpenTime'

interface CandleRecord {
  id: string
  symbol: string
  interval: string
  symbolInterval: string
  openTime: number
  kline: BinanceKline
}

interface CandleStoreOptions {
  forceMemory?: boolean
}

function getSymbolIntervalKey(symbol: string, interval: string): string {
  return `${symbol}|${interval}`
}

function getRecordId(symbol: string, interval: string, openTime: number): string {
  return `${symbol}|${interval}|${openTime}`
}

function sortByOpenTimeAsc(candles: BinanceKline[]): BinanceKline[] {
  return candles.sort((a, b) => a.openTime - b.openTime)
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeKline(input: Partial<BinanceKline> & { openTime?: number }): BinanceKline {
  const openTime = toNumber(input.openTime, 0)
  const closeTime = toNumber(input.closeTime, openTime + 3_599_999)

  return {
    openTime,
    open: String(input.open ?? '0'),
    high: String(input.high ?? input.open ?? '0'),
    low: String(input.low ?? input.open ?? '0'),
    close: String(input.close ?? input.open ?? '0'),
    volume: String(input.volume ?? '0'),
    closeTime,
    quoteAssetVolume: String(input.quoteAssetVolume ?? '0'),
    numberOfTrades: toNumber(input.numberOfTrades, 0),
    takerBuyBaseVolume: String(input.takerBuyBaseVolume ?? '0'),
    takerBuyQuoteVolume: String(input.takerBuyQuoteVolume ?? '0'),
  }
}

function parseCandleLike(raw: unknown): BinanceKline | null {
  if (Array.isArray(raw)) {
    if (raw.length < 5) {
      return null
    }

    return normalizeKline({
      openTime: toNumber(raw[0], 0),
      open: String(raw[1] ?? '0'),
      high: String(raw[2] ?? '0'),
      low: String(raw[3] ?? '0'),
      close: String(raw[4] ?? '0'),
      volume: String(raw[5] ?? '0'),
      closeTime: toNumber(raw[6], toNumber(raw[0], 0) + 3_599_999),
      quoteAssetVolume: String(raw[7] ?? '0'),
      numberOfTrades: toNumber(raw[8], 0),
      takerBuyBaseVolume: String(raw[9] ?? '0'),
      takerBuyQuoteVolume: String(raw[10] ?? '0'),
    })
  }

  if (typeof raw !== 'object' || raw === null) {
    return null
  }

  const candidate = raw as Partial<BinanceKline>
  if (!Number.isFinite(Number(candidate.openTime))) {
    return null
  }

  return normalizeKline(candidate)
}

function parseCsvToCandles(csvContent: string): BinanceKline[] {
  const rows = csvContent
    .split(/\r?\n/)
    .map(row => row.trim())
    .filter(Boolean)

  if (rows.length === 0) {
    return []
  }

  const dataRows = rows[0].toLowerCase().includes('opentime') ? rows.slice(1) : rows

  const parsed = dataRows
    .map(line => line.split(',').map(part => part.trim()))
    .map(parts =>
      parseCandleLike([
        parts[0],
        parts[1],
        parts[2],
        parts[3],
        parts[4],
        parts[5],
        parts[6],
        parts[7],
        parts[8],
        parts[9],
        parts[10],
      ])
    )
    .filter((item): item is BinanceKline => item !== null)

  return sortByOpenTimeAsc(parsed)
}

function candlesToCsv(candles: BinanceKline[]): string {
  const header =
    'openTime,open,high,low,close,volume,closeTime,quoteAssetVolume,numberOfTrades,takerBuyBaseVolume,takerBuyQuoteVolume'

  if (candles.length === 0) {
    return header
  }

  const rows = candles.map(candle =>
    [
      candle.openTime,
      candle.open,
      candle.high,
      candle.low,
      candle.close,
      candle.volume,
      candle.closeTime,
      candle.quoteAssetVolume,
      candle.numberOfTrades,
      candle.takerBuyBaseVolume,
      candle.takerBuyQuoteVolume,
    ].join(',')
  )

  return [header, ...rows].join('\n')
}

function dedupeCandles(candles: BinanceKline[]): BinanceKline[] {
  const map = new Map<number, BinanceKline>()
  for (const candle of candles) {
    const normalized = normalizeKline(candle)
    map.set(normalized.openTime, normalized)
  }
  return sortByOpenTimeAsc(Array.from(map.values()))
}

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
}

function awaitTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction error'))
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

class MemoryCandleStore implements CandleStoreLike {
  private readonly map = new Map<string, BinanceKline[]>()

  async saveCandles(symbol: string, interval: string, candles: BinanceKline[]): Promise<number> {
    const key = getSymbolIntervalKey(symbol, interval)
    const existing = this.map.get(key) ?? []
    const merged = dedupeCandles([...existing, ...candles])
    this.map.set(key, merged)
    return candles.length
  }

  async getCandles(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number
  ): Promise<BinanceKline[]> {
    const key = getSymbolIntervalKey(symbol, interval)
    const candles = this.map.get(key) ?? []

    return candles.filter(candle => {
      if (typeof startTime === 'number' && candle.openTime < startTime) {
        return false
      }
      if (typeof endTime === 'number' && candle.openTime > endTime) {
        return false
      }
      return true
    })
  }

  async getLatestTimestamp(symbol: string, interval: string): Promise<number | null> {
    const key = getSymbolIntervalKey(symbol, interval)
    const candles = this.map.get(key)
    if (!candles || candles.length === 0) {
      return null
    }
    return candles[candles.length - 1].openTime
  }

  async clearSymbol(symbol: string): Promise<void> {
    const keys = Array.from(this.map.keys())
    for (const key of keys) {
      if (key.startsWith(`${symbol}|`)) {
        this.map.delete(key)
      }
    }
  }
}

export class CandleStore implements CandleStoreLike {
  private readonly memory = new MemoryCandleStore()
  private readonly forceMemory: boolean
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor(options: CandleStoreOptions = {}) {
    this.forceMemory = Boolean(options.forceMemory)
  }

  private useMemory(): boolean {
    return this.forceMemory || !isIndexedDbAvailable()
  }

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        const store = db.objectStoreNames.contains(STORE_NAME)
          ? request.transaction!.objectStore(STORE_NAME)
          : db.createObjectStore(STORE_NAME, { keyPath: 'id' })

        if (!store.indexNames.contains(INDEX_SYMBOL_INTERVAL)) {
          store.createIndex(INDEX_SYMBOL_INTERVAL, 'symbolInterval', { unique: false })
        }

        if (!store.indexNames.contains(INDEX_SYMBOL_INTERVAL_OPEN_TIME)) {
          store.createIndex(INDEX_SYMBOL_INTERVAL_OPEN_TIME, ['symbolInterval', 'openTime'], {
            unique: false,
          })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
    })

    return this.dbPromise
  }

  async saveCandles(symbol: string, interval: string, candles: BinanceKline[]): Promise<number> {
    if (this.useMemory()) {
      return this.memory.saveCandles(symbol, interval, candles)
    }

    const db = await this.openDb()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const symbolInterval = getSymbolIntervalKey(symbol, interval)

    for (const candle of dedupeCandles(candles)) {
      const record: CandleRecord = {
        id: getRecordId(symbol, interval, candle.openTime),
        symbol,
        interval,
        symbolInterval,
        openTime: candle.openTime,
        kline: normalizeKline(candle),
      }
      store.put(record)
    }

    await awaitTransaction(transaction)
    return candles.length
  }

  async getCandles(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number
  ): Promise<BinanceKline[]> {
    if (this.useMemory()) {
      return this.memory.getCandles(symbol, interval, startTime, endTime)
    }

    const db = await this.openDb()
    const symbolInterval = getSymbolIntervalKey(symbol, interval)
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index(INDEX_SYMBOL_INTERVAL_OPEN_TIME)

    const lower = [symbolInterval, typeof startTime === 'number' ? startTime : 0]
    const upper = [symbolInterval, typeof endTime === 'number' ? endTime : Number.MAX_SAFE_INTEGER]
    const range = IDBKeyRange.bound(lower, upper)

    const records = (await requestToPromise(index.getAll(range))) as CandleRecord[]

    return sortByOpenTimeAsc(records.map(record => normalizeKline(record.kline)))
  }

  async getLatestTimestamp(symbol: string, interval: string): Promise<number | null> {
    if (this.useMemory()) {
      return this.memory.getLatestTimestamp(symbol, interval)
    }

    const db = await this.openDb()
    const symbolInterval = getSymbolIntervalKey(symbol, interval)
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index(INDEX_SYMBOL_INTERVAL_OPEN_TIME)
    const lower = [symbolInterval, 0]
    const upper = [symbolInterval, Number.MAX_SAFE_INTEGER]
    const range = IDBKeyRange.bound(lower, upper)

    return new Promise<number | null>((resolve, reject) => {
      const request = index.openCursor(range, 'prev')
      request.onsuccess = () => {
        const cursor = request.result
        resolve(cursor ? (cursor.value as CandleRecord).openTime : null)
      }
      request.onerror = () => reject(request.error ?? new Error('Failed to query latest timestamp'))
    })
  }

  async clearSymbol(symbol: string): Promise<void> {
    if (this.useMemory()) {
      await this.memory.clearSymbol(symbol)
      return
    }

    const db = await this.openDb()
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    await new Promise<void>((resolve, reject) => {
      const request = store.openCursor()
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) {
          resolve()
          return
        }

        const record = cursor.value as CandleRecord
        if (record.symbol === symbol) {
          cursor.delete()
        }
        cursor.continue()
      }
      request.onerror = () => reject(request.error ?? new Error('Failed to clear symbol data'))
    })

    await awaitTransaction(transaction)
  }

  async exportCandles(
    symbol: string,
    interval: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const candles = await this.getCandles(symbol, interval)

    if (format === 'csv') {
      return candlesToCsv(candles)
    }

    return JSON.stringify(
      {
        symbol,
        interval,
        exportedAt: new Date().toISOString(),
        candles,
      },
      null,
      2
    )
  }

  async importCandles(
    symbol: string,
    interval: string,
    payload: string,
    format: 'json' | 'csv' = 'json'
  ): Promise<number> {
    let candles: BinanceKline[] = []

    if (format === 'csv') {
      candles = parseCsvToCandles(payload)
    } else {
      const parsed = JSON.parse(payload) as unknown

      if (Array.isArray(parsed)) {
        candles = parsed
          .map(item => parseCandleLike(item))
          .filter((item): item is BinanceKline => item !== null)
      } else if (typeof parsed === 'object' && parsed !== null) {
        const objectPayload = parsed as { candles?: unknown[] }
        candles = (objectPayload.candles ?? [])
          .map(item => parseCandleLike(item))
          .filter((item): item is BinanceKline => item !== null)
      }
    }

    if (candles.length === 0) {
      return 0
    }

    await this.saveCandles(symbol, interval, candles)
    return candles.length
  }
}

let browserCandleStore: CandleStore | null = null

export function getCandleStore(): CandleStore {
  if (!browserCandleStore) {
    browserCandleStore = new CandleStore()
  }
  return browserCandleStore
}

export function createMemoryCandleStore(): CandleStore {
  return new CandleStore({ forceMemory: true })
}

export { parseCsvToCandles, candlesToCsv, normalizeKline }
