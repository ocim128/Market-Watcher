/**
 * Historical tracking types
 */

import type { PairAnalysisResult, ConfluenceResult } from '@/types'

export interface HistoricalRecord {
  id: string
  timestamp: number
  date: string
  primaryPair: string
  interval: string
  results: PairAnalysisResult[]
  confluenceResults?: ConfluenceResult[]
  marketContext: {
    totalPairs: number
    premiumCount: number
    strongCorrCount: number
    avgOpportunity: number
    marketRegime: 'trending' | 'ranging' | 'choppy' | 'unknown'
  }
}

export interface PairHistoricalData {
  symbol: string
  primarySymbol: string
  firstSeen: number
  lastSeen: number
  totalOccurrences: number
  avgOpportunityScore: number
  maxOpportunityScore: number
  minOpportunityScore: number
  avgZScore: number
  avgCorrelation: number
  signalQualityDistribution: Record<string, number>
  opportunityTrend: 'improving' | 'declining' | 'stable' | 'volatile'
  recentSignals: HistoricalSignal[]
}

export interface HistoricalSignal {
  timestamp: number
  opportunityScore: number
  zScore: number
  correlation: number
  signalQuality: string
  wasExtreme: boolean
}

export interface OpportunityTrend {
  pair: string
  trend: 'improving' | 'declining' | 'stable' | 'volatile'
  changePercent: number
  consistency: number
}

export interface HistoryStats {
  totalSnapshots: number
  dateRange: { start: number; end: number }
  mostActivePairs: string[]
  bestPerformingPairs: string[]
  signalAccuracy: {
    premium: { total: number; worked: number }
    strong: { total: number; worked: number }
    moderate: { total: number; worked: number }
  }
}
