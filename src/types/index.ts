// Pair Analysis Types - mirroring your .NET models

export interface PairAnalysisResult {
  // Metadata
  pairKey: string
  symbol: string
  primarySymbol: string
  timestamp: number

  // Core metrics
  correlation: number
  spreadMean: number
  spreadStd: number
  spreadZScore: number
  hedgeRatioBeta: number
  stationarity: StationarityAnalysis
  ratio: number
  alignedBars: number

  // Opportunity scoring
  opportunityScore: number
  reversionProbability: ReversionProbability
  spreadOpportunity: number
  methodAverage: number

  // Volatility-adjusted spread
  volatilitySpread: VolatilityAdjustedSpreadResult

  // Correlation dynamics
  correlationVelocity: CorrelationVelocityResult

  // Multi-method confluence (Feature #1)
  confluence: ConfluenceAnalysis

  // Notes from analysis
  notes: string[]
}

export interface VolatilityAdjustedSpreadResult {
  rawZScore: number
  adjustedZScore: number
  combinedVolatility: number
  primaryVolatility: number
  secondaryVolatility: number
  signalStrength: number
  signalQuality: SignalQuality
}

export interface CorrelationVelocityResult {
  currentCorrelation: number
  previousCorrelation: number
  velocity: number
  acceleration: number
  regime: CorrelationRegime
}

export interface StationarityAnalysis {
  adfTStat: number
  adfCriticalValue: number
  adfPassed: boolean
  cointegrationTStat: number
  cointegrationCriticalValue: number
  cointegrationPassed: boolean
  halfLifeBars: number
  halfLifePassed: boolean
  isTradable: boolean
}

export interface ReversionProbability {
  probability: number // 0..1
  lookaheadBars: number
  sampleSize: number
  wins: number
  method: 'history' | 'fallback'
}

// ============================================================================
// Multi-Method Confluence Types (Feature #1: Advanced Signal Detection)
// ============================================================================

export interface ConfluenceIndicator {
  name: string
  active: boolean
  value: string
}

export interface ConfluenceAnalysis {
  /** Confluence Rating (0-3): Number of indicators that agree */
  rating: number
  /** Human-readable rating label */
  ratingLabel: string
  /** Individual indicator states */
  indicators: {
    zScoreExtreme: boolean
    correlationStrengthening: boolean
    signalQualityStrong: boolean
  }
  /** Detailed indicator info for display */
  indicatorDetails: ConfluenceIndicator[]
  /** Whether this pair meets the minimum threshold (rating >= 2) */
  meetsThreshold: boolean
  /** Signal direction based on Z-score */
  direction: 'long_spread' | 'short_spread' | 'neutral'
}

export type SignalQuality =
  | 'premium'
  | 'strong'
  | 'moderate'
  | 'weak'
  | 'noisy'
  | 'insufficient_data'

export type CorrelationRegime =
  | 'stable_strong'
  | 'stable_weak'
  | 'stable'
  | 'strengthening'
  | 'recovering'
  | 'weakening'
  | 'breaking_down'

// Binance API Types

export interface BinanceKline {
  openTime: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  closeTime: number
  quoteAssetVolume: string
  numberOfTrades: number
  takerBuyBaseVolume: string
  takerBuyQuoteVolume: string
}

export interface BinanceSymbolInfo {
  symbol: string
  status: string
  baseAsset: string
  quoteAsset: string
}

export interface BinanceExchangeInfo {
  timezone: string
  serverTime: number
  symbols: BinanceSymbolInfo[]
}

export interface Binance24hrTicker {
  symbol: string
  priceChangePercent: string
  lastPrice: string
  quoteVolume: string
  volume: string
}

// Application State Types

export interface ScanProgress {
  current: number
  total: number
  currentSymbol: string
  status: 'idle' | 'scanning' | 'complete' | 'error'
  error?: string
}

export interface FilterOptions {
  minCorrelation: number
  maxCorrelation: number
  minZScore: number
  minOpportunity: number
  minConfluence: number
  signalQualities: SignalQuality[]
  regimes: CorrelationRegime[]
}

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
  minCorrelation: 0.4,
  maxCorrelation: 1,
  minZScore: 1.2,
  minOpportunity: 45,
  minConfluence: 2,
  signalQualities: ['premium', 'strong', 'moderate'],
  regimes: ['stable_strong', 'strengthening', 'recovering', 'stable'],
}

// Multi-Timeframe Confluence Types

// Import IntervalType from config (single source of truth)
import type { IntervalType as ConfigIntervalType } from '@/config'

// Re-export with the same name
export type IntervalType = ConfigIntervalType

// Extended to support custom resampled intervals like "2m", "7m", "10m"

export interface MultiTimeframeConfluence {
  confluenceScore: number
  confidence: 'high' | 'medium' | 'low' | 'mixed'
  timeframeAnalyses: TimeframeAnalysis[]
  alignedTimeframes: number
  totalTimeframes: number
  averageOpportunity: number
  bestTimeframe: IntervalType | null
  worstTimeframe: IntervalType | null
  signalDirection: 'long_spread' | 'short_spread' | 'neutral'
  zScoreAgreement: number
  correlationAgreement: number
  qualityAgreement: number
}

export interface TimeframeAnalysis {
  interval: string // Supports both native ("5m") and custom ("7m") intervals
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
  bestTimeframe: string | null // e.g., "5m" or "7m"
  worstTimeframe: string | null
  signalDirection: 'long_spread' | 'short_spread' | 'neutral'
  zScoreAgreement: number
  correlationAgreement: number
  qualityAgreement: number
  notes: string[]
}

// Historical Tracking Types

export interface HistoricalSnapshot {
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

// Configuration

export interface AppConfig {
  primaryPair: string
  scanMode: 'primary_vs_all' | 'all_vs_all'
  interval: string
  totalBars: number
  topPairsLimit: number
  refreshIntervalMs: number
}

export const DEFAULT_CONFIG: AppConfig = {
  primaryPair: 'ETHUSDT',
  scanMode: 'primary_vs_all',
  interval: '1h',
  totalBars: 1500,
  topPairsLimit: 120,
  refreshIntervalMs: 10 * 60 * 1000,
}
