import type { BinanceKline } from '@/types'

export interface ScannerThresholds {
  perf3m: number
  perf6m: number
  perf12m: number
}

export interface UniverseSettings {
  pairLimit: number
  thresholds: ScannerThresholds
  exclusions: string[]
  interval: string
  refreshIntervalDays: number
}

export interface UniverseEntry {
  symbol: string
  perf3m: number
  perf6m: number
  perf12m: number
  criteriasMet: number
  rank: number
  volume24h: number
  currentPrice: number
  score: number
}

export interface UniverseSnapshot {
  updatedAt: number
  settings: UniverseSettings
  entries: UniverseEntry[]
}

export interface CrossoverEvent {
  index: number
  from: number
  to: number
  crossedBelow: boolean
  crossedAbove: boolean
}

export interface Signal {
  id: string
  symbol: string
  timestamp: number
  rsi: number
  price: number
  rating: number
  meanReversionDist: number
  volume24hRank: number
  momentum3m: number
}

export interface SignalHistoryRecord extends Signal {
  outcome: 'open' | 'tp' | 'timeout'
  holdBars: number
  pnlPercent: number
  evaluatedAt: number
}

export interface MarketContext {
  totalSignals: number
  marketBreadth: number
}

export interface CandleDownloadSummary {
  symbol: string
  fetched: number
  saved: number
  latestTimestamp: number | null
}

export interface ScannerBacktestTrade {
  symbol: string
  entryTime: number
  exitTime: number
  entryPrice: number
  exitPrice: number
  holdBars: number
  exitReason: 'take_profit' | 'stop_loss' | 'max_hold' | 'end_of_data'
  pnlPercent: number
}

export interface ScannerBacktestStats {
  totalTrades: number
  winners: number
  losers: number
  winRate: number
  avgHoldBars: number
  avgPnlPercent: number
  totalPnlPercent: number
  grossProfitPercent: number
  grossLossPercent: number
  profitFactor: number
  expectancyPercent: number
}

export interface ScannerBacktestResult {
  symbol: string
  trades: ScannerBacktestTrade[]
  stats: ScannerBacktestStats
}

export interface MomentumBacktestConfig {
  rsiPeriod: number
  rsiThreshold: number
  takeProfitPercent: number
  stopLossPercent: number
  maxHoldBars: number
  cooldownBars: number
}

export interface CandleStoreLike {
  saveCandles: (symbol: string, interval: string, candles: BinanceKline[]) => Promise<number>
  getCandles: (
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number
  ) => Promise<BinanceKline[]>
  getLatestTimestamp: (symbol: string, interval: string) => Promise<number | null>
  clearSymbol: (symbol: string) => Promise<void>
}

export const DEFAULT_SCANNER_SETTINGS: UniverseSettings = {
  pairLimit: 120,
  thresholds: {
    perf3m: 25,
    perf6m: 45,
    perf12m: 75,
  },
  exclusions: [],
  interval: '1h',
  refreshIntervalDays: 14,
}

export const DEFAULT_MOMENTUM_BACKTEST_CONFIG: MomentumBacktestConfig = {
  rsiPeriod: 14,
  rsiThreshold: 30,
  takeProfitPercent: 3,
  stopLossPercent: 4,
  maxHoldBars: 10,
  cooldownBars: 2,
}
