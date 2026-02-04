/**
 * Historical tracking utilities
 */

import type { PairAnalysisResult } from '@/types'
import type {
  HistoricalRecord,
  HistoricalSignal,
  PairHistoricalData,
  OpportunityTrend,
  HistoryStats,
} from './tracking-types'

export const MAX_HISTORY_DAYS = 30
export const MAX_SNAPSHOTS_PER_DAY = 144

export function calculateMarketContext(results: PairAnalysisResult[]) {
  const premiumCount = results.filter(r => r.volatilitySpread.signalQuality === 'premium').length
  const strongCorrCount = results.filter(r => Math.abs(r.correlation) >= 0.7).length
  const avgOpportunity =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.opportunityScore, 0) / results.length
      : 0

  const extremeZCount = results.filter(r => Math.abs(r.spreadZScore) > 2).length
  let marketRegime: 'trending' | 'ranging' | 'choppy' | 'unknown' = 'unknown'
  if (results.length > 0) {
    const extremeRatio = extremeZCount / results.length
    if (extremeRatio > 0.3) {
      marketRegime = 'trending'
    } else if (extremeRatio < 0.1) {
      marketRegime = 'ranging'
    } else {
      marketRegime = 'choppy'
    }
  }

  return {
    totalPairs: results.length,
    premiumCount,
    strongCorrCount,
    avgOpportunity: Math.round(avgOpportunity),
    marketRegime,
  }
}

export function limitSnapshotsPerDay(history: HistoricalRecord[]): HistoricalRecord[] {
  const byDay: Record<string, HistoricalRecord[]> = {}

  for (const record of history) {
    const day = new Date(record.timestamp).toDateString()
    if (!byDay[day]) {
      byDay[day] = []
    }
    byDay[day].push(record)
  }

  const result: HistoricalRecord[] = []
  for (const dayRecords of Object.values(byDay)) {
    const sorted = dayRecords.sort((a, b) => b.timestamp - a.timestamp)
    result.push(...sorted.slice(0, MAX_SNAPSHOTS_PER_DAY))
  }

  return result.sort((a, b) => a.timestamp - b.timestamp)
}

export function calculateTrend(
  values: number[]
): 'improving' | 'declining' | 'stable' | 'volatile' {
  if (values.length < 3) {
    return 'stable'
  }

  const n = values.length
  const sumX = (n * (n - 1)) / 2
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0)
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  const changes: number[] = []
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1])
  }
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length
  const variance = changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length
  const volatility = Math.sqrt(variance)

  if (volatility > 15) {
    return 'volatile'
  }
  if (slope > 2) {
    return 'improving'
  }
  if (slope < -2) {
    return 'declining'
  }
  return 'stable'
}

export function processPairRecords(
  history: HistoricalRecord[],
  symbol: string
): { records: HistoricalSignal[]; stats: Partial<PairHistoricalData> } | null {
  const pairRecords: HistoricalSignal[] = []
  let totalOpportunity = 0
  let maxOpportunity = 0
  let minOpportunity = 100
  let totalZScore = 0
  let totalCorrelation = 0
  const qualityDistribution: Record<string, number> = {}
  let firstSeen = Infinity
  let lastSeen = 0
  let count = 0

  for (const record of history) {
    for (const result of record.results) {
      if (result.symbol === symbol) {
        pairRecords.push({
          timestamp: record.timestamp,
          opportunityScore: result.opportunityScore,
          zScore: result.spreadZScore,
          correlation: result.correlation,
          signalQuality: result.volatilitySpread.signalQuality,
          wasExtreme: Math.abs(result.spreadZScore) > 2,
        })

        totalOpportunity += result.opportunityScore
        maxOpportunity = Math.max(maxOpportunity, result.opportunityScore)
        minOpportunity = Math.min(minOpportunity, result.opportunityScore)
        totalZScore += Math.abs(result.spreadZScore)
        totalCorrelation += Math.abs(result.correlation)

        qualityDistribution[result.volatilitySpread.signalQuality] =
          (qualityDistribution[result.volatilitySpread.signalQuality] || 0) + 1

        firstSeen = Math.min(firstSeen, record.timestamp)
        lastSeen = Math.max(lastSeen, record.timestamp)
        count++
      }
    }
  }

  if (count === 0) {
    return null
  }

  return {
    records: pairRecords,
    stats: {
      firstSeen,
      lastSeen,
      totalOccurrences: count,
      avgOpportunityScore: Math.round(totalOpportunity / count),
      maxOpportunityScore: maxOpportunity,
      minOpportunityScore: minOpportunity === 100 ? 0 : minOpportunity,
      avgZScore: totalZScore / count,
      avgCorrelation: totalCorrelation / count,
      signalQualityDistribution: qualityDistribution,
    },
  }
}

export function calculateOpportunityTrends(history: HistoricalRecord[]): OpportunityTrend[] {
  const pairScores: Record<string, number[]> = {}

  for (const record of history) {
    for (const result of record.results) {
      if (!pairScores[result.symbol]) {
        pairScores[result.symbol] = []
      }
      pairScores[result.symbol].push(result.opportunityScore)
    }
  }

  return Object.entries(pairScores)
    .map(([pair, scores]) => {
      const trend = calculateTrend(scores)
      const first = scores[0] || 0
      const last = scores[scores.length - 1] || 0
      const changePercent = first > 0 ? ((last - first) / first) * 100 : 0

      let consistentMoves = 0
      for (let i = 1; i < scores.length; i++) {
        if (
          (scores[i] >= scores[i - 1] && scores[i - 1] >= (scores[i - 2] || scores[i - 1])) ||
          (scores[i] <= scores[i - 1] && scores[i - 1] <= (scores[i - 2] || scores[i - 1]))
        ) {
          consistentMoves++
        }
      }
      const consistency = scores.length > 1 ? consistentMoves / (scores.length - 1) : 0

      return {
        pair,
        trend,
        changePercent: Math.round(changePercent * 10) / 10,
        consistency: Math.round(consistency * 100) / 100,
      }
    })
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
}

export function calculateHistoryStats(history: HistoricalRecord[]): HistoryStats {
  if (history.length === 0) {
    return {
      totalSnapshots: 0,
      dateRange: { start: 0, end: 0 },
      mostActivePairs: [],
      bestPerformingPairs: [],
      signalAccuracy: {
        premium: { total: 0, worked: 0 },
        strong: { total: 0, worked: 0 },
        moderate: { total: 0, worked: 0 },
      },
    }
  }

  const timestamps = history.map(h => h.timestamp)
  const start = Math.min(...timestamps)
  const end = Math.max(...timestamps)

  const pairCounts: Record<string, number> = {}
  for (const record of history) {
    for (const result of record.results) {
      pairCounts[result.symbol] = (pairCounts[result.symbol] || 0) + 1
    }
  }
  const mostActive = Object.entries(pairCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([pair]) => pair)

  return {
    totalSnapshots: history.length,
    dateRange: { start, end },
    mostActivePairs: mostActive,
    bestPerformingPairs: [],
    signalAccuracy: {
      premium: { total: 0, worked: 0 },
      strong: { total: 0, worked: 0 },
      moderate: { total: 0, worked: 0 },
    },
  }
}

export function generateCSV(history: HistoricalRecord[]): string {
  const rows: string[] = []
  rows.push(
    'timestamp,date,symbol,primary_pair,opportunity_score,z_score,correlation,signal_quality'
  )

  for (const record of history) {
    for (const result of record.results) {
      rows.push(
        [
          record.timestamp,
          new Date(record.timestamp).toISOString(),
          result.symbol,
          result.primarySymbol,
          result.opportunityScore,
          result.spreadZScore.toFixed(4),
          result.correlation.toFixed(4),
          result.volatilitySpread.signalQuality,
        ].join(',')
      )
    }
  }

  return rows.join('\n')
}
