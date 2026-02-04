/**
 * Multi-timeframe confluence analysis types
 */

import type { PairAnalysisResult } from '@/types'

export interface TimeframeAnalysis {
  interval: string
  result: PairAnalysisResult
  weight: number
}

export interface ConfluenceResult {
  symbol: string
  primarySymbol: string
  confluenceScore: number
  confidence: 'high' | 'medium' | 'low' | 'mixed'
  timeframeAnalyses: TimeframeAnalysis[]
  alignedTimeframes: number
  totalTimeframes: number
  averageOpportunity: number
  bestTimeframe: string | null
  worstTimeframe: string | null
  signalDirection: 'long_spread' | 'short_spread' | 'neutral'
  zScoreAgreement: number
  correlationAgreement: number
  qualityAgreement: number
  notes: string[]
}

export interface ConfluenceOptions {
  intervals?: string[]
  minAlignedTimeframes?: number
  zScoreThreshold?: number
  correlationThreshold?: number
}

export const TIMEFRAME_WEIGHTS: Record<string, number> = {
  '1m': 0.5,
  '2m': 0.52,
  '3m': 0.6,
  '4m': 0.63,
  '5m': 0.7,
  '6m': 0.72,
  '7m': 0.73,
  '8m': 0.74,
  '9m': 0.75,
  '10m': 0.76,
  '12m': 0.78,
  '15m': 0.85,
  '20m': 0.87,
  '30m': 0.9,
  '1h': 1.0,
  '2h': 0.95,
  '4h': 0.92,
  '1d': 0.85,
}

export const DEFAULT_CONFLUENCE_INTERVALS: string[] = ['5m', '15m', '1h']

export const DEFAULT_OPTIONS: Required<ConfluenceOptions> = {
  intervals: DEFAULT_CONFLUENCE_INTERVALS,
  minAlignedTimeframes: 2,
  zScoreThreshold: 1.5,
  correlationThreshold: 0.6,
}
