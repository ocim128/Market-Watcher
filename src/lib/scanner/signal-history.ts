import type { CandleStoreLike, SignalHistoryRecord } from './types'
import { evaluateSignalOutcome } from './signal-generator'

const STORAGE_KEY = 'market-watcher-scanner-history'
const RETENTION_DAYS = 120

function now(): number {
  return Date.now()
}

function prune(records: SignalHistoryRecord[]): SignalHistoryRecord[] {
  const cutoff = now() - RETENTION_DAYS * 24 * 60 * 60 * 1000
  return records
    .filter(record => record.timestamp >= cutoff)
    .sort((a, b) => b.timestamp - a.timestamp)
}

export function loadSignalHistory(): SignalHistoryRecord[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as SignalHistoryRecord[]
    return Array.isArray(parsed) ? prune(parsed) : []
  } catch {
    return []
  }
}

export function saveSignalHistory(records: SignalHistoryRecord[]): void {
  if (typeof window === 'undefined') {
    return
  }

  const cleaned = prune(records)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
}

export function clearSignalHistory(): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(STORAGE_KEY)
}

export function mergeSignalHistory(
  existing: SignalHistoryRecord[],
  incoming: SignalHistoryRecord[]
): SignalHistoryRecord[] {
  const map = new Map<string, SignalHistoryRecord>()

  for (const record of existing) {
    map.set(record.id, record)
  }

  for (const record of incoming) {
    const prev = map.get(record.id)
    if (!prev || prev.evaluatedAt <= record.evaluatedAt) {
      map.set(record.id, record)
    }
  }

  return prune(Array.from(map.values()))
}

export function getSignalHistoryStats(records: SignalHistoryRecord[]): {
  total: number
  open: number
  wins: number
  losses: number
  winRate: number
  avgPnlPercent: number
} {
  if (records.length === 0) {
    return {
      total: 0,
      open: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      avgPnlPercent: 0,
    }
  }

  const open = records.filter(record => record.outcome === 'open').length
  const resolved = records.filter(record => record.outcome !== 'open')
  const wins = resolved.filter(record => record.outcome === 'tp').length
  const losses = resolved.filter(record => record.outcome === 'timeout').length
  const avgPnlPercent = records.reduce((sum, record) => sum + record.pnlPercent, 0) / records.length

  return {
    total: records.length,
    open,
    wins,
    losses,
    winRate: resolved.length > 0 ? (wins / resolved.length) * 100 : 0,
    avgPnlPercent,
  }
}

export async function reevaluateSignalRecords(
  records: SignalHistoryRecord[],
  candleStore: CandleStoreLike,
  interval: string,
  takeProfitPercent: number = 3,
  maxHoldBars: number = 10
): Promise<SignalHistoryRecord[]> {
  const bySymbol = new Map<string, SignalHistoryRecord[]>()

  for (const record of records) {
    const list = bySymbol.get(record.symbol) ?? []
    list.push(record)
    bySymbol.set(record.symbol, list)
  }

  const updated: SignalHistoryRecord[] = []

  for (const [symbol, symbolRecords] of bySymbol.entries()) {
    const candles = await candleStore.getCandles(symbol, interval)

    for (const record of symbolRecords) {
      updated.push(evaluateSignalOutcome(record, candles, takeProfitPercent, maxHoldBars))
    }
  }

  return updated
}
