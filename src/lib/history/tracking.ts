/**
 * Historical tracking system for opportunity data
 * Persists scan results and analyzes performance over time
 */

import type { PairAnalysisResult, ConfluenceResult } from '@/types'
import type {
  HistoricalRecord,
  PairHistoricalData,
  OpportunityTrend,
  HistoryStats,
  HistoricalSignal,
} from './tracking-types'
import {
  MAX_HISTORY_DAYS,
  calculateMarketContext,
  limitSnapshotsPerDay,
  calculateTrend,
  processPairRecords,
  calculateOpportunityTrends,
  calculateHistoryStats,
  generateCSV,
} from './tracking-utils'

const STORAGE_KEY = 'market-watcher-history'

export type {
  HistoricalRecord,
  PairHistoricalData,
  OpportunityTrend,
  HistoryStats,
  HistoricalSignal,
}

export function saveSnapshot(
  results: PairAnalysisResult[],
  primaryPair: string,
  interval: string,
  confluenceResults?: ConfluenceResult[]
): HistoricalRecord {
  const now = Date.now()
  const record: HistoricalRecord = {
    id: `snap_${now}`,
    timestamp: now,
    date: new Date(now).toISOString(),
    primaryPair,
    interval,
    results,
    confluenceResults,
    marketContext: calculateMarketContext(results),
  }

  const history = loadHistory()
  history.push(record)

  const cutoff = now - MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000
  const filtered = history.filter(h => h.timestamp > cutoff)
  const cleaned = limitSnapshotsPerDay(filtered)

  localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
  return record
}

export function loadHistory(): HistoricalRecord[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(STORAGE_KEY)
}

export function getPairHistory(symbol: string): PairHistoricalData | null {
  const history = loadHistory()
  const processed = processPairRecords(history, symbol)

  if (!processed) {
    return null
  }

  const { records, stats } = processed
  const trend = calculateTrend(records.map(r => r.opportunityScore))

  return {
    symbol,
    primarySymbol:
      history
        .find(h => h.results.some(r => r.symbol === symbol))
        ?.results.find(r => r.symbol === symbol)?.primarySymbol || '',
    firstSeen: stats.firstSeen!,
    lastSeen: stats.lastSeen!,
    totalOccurrences: stats.totalOccurrences!,
    avgOpportunityScore: stats.avgOpportunityScore!,
    maxOpportunityScore: stats.maxOpportunityScore!,
    minOpportunityScore: stats.minOpportunityScore!,
    avgZScore: stats.avgZScore!,
    avgCorrelation: stats.avgCorrelation!,
    signalQualityDistribution: stats.signalQualityDistribution!,
    opportunityTrend: trend,
    recentSignals: records.slice(-20),
  }
}

export function getOpportunityTrends(): OpportunityTrend[] {
  return calculateOpportunityTrends(loadHistory())
}

export function getBestHistoricalOpportunities(
  limit: number = 10,
  minQuality: string = 'strong'
): { symbol: string; avgScore: number; occurrences: number; lastSeen: number }[] {
  const history = loadHistory()
  const pairStats: Record<string, { total: number; count: number; lastSeen: number }> = {}

  const qualityLevels = ['premium', 'strong', 'moderate', 'weak', 'noisy']
  const minQualityIndex = qualityLevels.indexOf(minQuality)

  for (const record of history) {
    for (const result of record.results) {
      const resultQualityIndex = qualityLevels.indexOf(result.volatilitySpread.signalQuality)
      if (resultQualityIndex <= minQualityIndex) {
        if (!pairStats[result.symbol]) {
          pairStats[result.symbol] = { total: 0, count: 0, lastSeen: 0 }
        }
        pairStats[result.symbol].total += result.opportunityScore
        pairStats[result.symbol].count++
        pairStats[result.symbol].lastSeen = Math.max(
          pairStats[result.symbol].lastSeen,
          record.timestamp
        )
      }
    }
  }

  return Object.entries(pairStats)
    .map(([symbol, stats]) => ({
      symbol,
      avgScore: Math.round(stats.total / stats.count),
      occurrences: stats.count,
      lastSeen: stats.lastSeen,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, limit)
}

export function getHistoryStats(): HistoryStats {
  const history = loadHistory()
  const stats = calculateHistoryStats(history)

  // Best performing from our calculation
  const bestPerforming = getBestHistoricalOpportunities(10).map(o => o.symbol)

  return {
    ...stats,
    bestPerformingPairs: bestPerforming,
  }
}

export function exportHistoryToCSV(): string {
  return generateCSV(loadHistory())
}

export function getHistorySummary(): {
  snapshotsToday: number
  uniquePairsTracked: number
  bestOpportunityToday: { symbol: string; score: number } | null
  marketRegimeTrend: 'improving' | 'declining' | 'stable'
} {
  const history = loadHistory()
  const today = new Date().toDateString()

  const todayRecords = history.filter(h => new Date(h.timestamp).toDateString() === today)
  const snapshotsToday = todayRecords.length

  const allPairs = new Set<string>()
  let bestOpportunity: { symbol: string; score: number } | null = null

  for (const record of todayRecords) {
    for (const result of record.results) {
      allPairs.add(result.symbol)
      if (!bestOpportunity || result.opportunityScore > bestOpportunity.score) {
        bestOpportunity = { symbol: result.symbol, score: result.opportunityScore }
      }
    }
  }

  const regimes = history.slice(-10).map(h => h.marketContext.marketRegime)
  const regimeCounts = regimes.reduce(
    (acc, r) => {
      acc[r] = (acc[r] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  let marketRegimeTrend: 'improving' | 'declining' | 'stable' = 'stable'
  if ((regimeCounts['ranging'] || 0) > regimes.length * 0.6) {
    marketRegimeTrend = 'improving'
  } else if ((regimeCounts['trending'] || 0) > regimes.length * 0.6) {
    marketRegimeTrend = 'declining'
  }

  return {
    snapshotsToday,
    uniquePairsTracked: allPairs.size,
    bestOpportunityToday: bestOpportunity,
    marketRegimeTrend,
  }
}
