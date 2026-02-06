// Configuration for the app
// These can be overridden via environment variables if needed

export const AVAILABLE_INTERVALS = [
  { value: '1m', label: '1m', useCase: 'Scalping', barsPerHour: 60 },
  { value: '3m', label: '3m', useCase: 'Quick trades', barsPerHour: 20 },
  { value: '5m', label: '5m', useCase: 'Short-term', barsPerHour: 12 },
  { value: '15m', label: '15m', useCase: 'Intraday', barsPerHour: 4 },
  { value: '1h', label: '1h', useCase: 'Day trading', barsPerHour: 1 },
  { value: '4h', label: '4h', useCase: 'Swing trading', barsPerHour: 0.25 },
  { value: '1d', label: '1d', useCase: 'Position trading', barsPerHour: 1 / 24 },
] as const

export const PRESET_BARS = [
  { value: 100, label: '100' },
  { value: 200, label: '200' },
  { value: 500, label: '500' },
  { value: 1000, label: '1000' },
  { value: 1500, label: '1500' },
  { value: 2000, label: '2000' },
] as const

export const AVAILABLE_EXCHANGES = [
  {
    value: 'binance_spot',
    label: 'Binance Spot',
    description: 'Spot pairs from Binance',
  },
  {
    value: 'tradfi',
    label: 'TradFi',
    description: 'TradFi symbols from Bybit MT5 feed',
  },
] as const

export type ExchangeType = (typeof AVAILABLE_EXCHANGES)[number]['value']

export const AVAILABLE_SCAN_MODES = [
  {
    value: 'primary_vs_all',
    label: 'Primary vs All',
    description: 'Analyze one primary symbol against all scanned symbols',
  },
  {
    value: 'all_vs_all',
    label: 'All vs All',
    description: 'Analyze every scanned symbol combination',
  },
] as const

export type ScanMode = (typeof AVAILABLE_SCAN_MODES)[number]['value']

export const AVAILABLE_PRIMARY_PAIRS = [
  { value: 'BTCUSDT', label: 'BTC/USDT', description: 'Bitcoin - Market leader' },
  { value: 'ETHUSDT', label: 'ETH/USDT', description: 'Ethereum - DeFi standard' },
  { value: 'BNBUSDT', label: 'BNB/USDT', description: 'Binance Coin' },
  { value: 'SOLUSDT', label: 'SOL/USDT', description: 'Solana' },
  { value: 'XRPUSDT', label: 'XRP/USDT', description: 'Ripple' },
  { value: 'ADAUSDT', label: 'ADA/USDT', description: 'Cardano' },
  { value: 'AVAXUSDT', label: 'AVAX/USDT', description: 'Avalanche' },
  { value: 'DOGEUSDT', label: 'DOGE/USDT', description: 'Dogecoin' },
  { value: 'DOTUSDT', label: 'DOT/USDT', description: 'Polkadot' },
  { value: 'MATICUSDT', label: 'MATIC/USDT', description: 'Polygon' },
] as const

export const AVAILABLE_TRADFI_PRIMARY_PAIRS = [
  { value: 'TSLA', label: 'TSLA', description: 'Tesla' },
  { value: 'AAPL', label: 'AAPL', description: 'Apple' },
  { value: 'NAS100', label: 'NAS100', description: 'Nasdaq 100 Index' },
  { value: 'SP500', label: 'SP500', description: 'S&P 500 Index' },
  { value: 'XAUUSD+', label: 'XAUUSD+', description: 'Gold vs USD' },
] as const

export type PrimaryPairType =
  | (typeof AVAILABLE_PRIMARY_PAIRS)[number]['value']
  | (typeof AVAILABLE_TRADFI_PRIMARY_PAIRS)[number]['value']

// Define IntervalType from AVAILABLE_INTERVALS
export type IntervalType = (typeof AVAILABLE_INTERVALS)[number]['value']

export const config = {
  // Binance API
  binanceBaseUrl: 'https://api.binance.com',
  binanceWsUrl: 'wss://stream.binance.com:9443/ws',

  // Primary pair to compare against
  primaryPair: 'ETHUSDT',
  exchange: 'binance_spot' as ExchangeType,
  scanMode: 'primary_vs_all' as ScanMode,

  // Kline settings (defaults)
  interval: '1m' as IntervalType, // 1m for scalping
  totalBars: 1500, // ~25 hours at 1m, balanced for regime detection
  batchSize: 1000, // Binance max per request
  maxBars: 10000, // Maximum allowed bars

  // Scanning
  topPairsLimit: 120, // Binance-only: number of top USDT pairs to analyze
  scanDelayMs: 50, // Delay between API calls (faster for 1m data)

  // Refresh - shorter for 1m scalping
  staleTimeMs: 1 * 60 * 1000, // 1 minute stale
  refetchIntervalMs: 5 * 60 * 1000, // 5 minutes auto-refresh

  // Analysis thresholds (from your .NET code)
  thresholds: {
    strongCorrelation: 0.7,
    moderateCorrelation: 0.4,
    extremeZScore: 2.0,
    highZScore: 1.0,
    premiumVolatility: 0.02,
    strongVolatility: 0.04,
    noisyVolatility: 0.05,
    velocityThreshold: 0.01,
  },

  // Scoring weights (from your .NET code)
  scoring: {
    spreadWeight: 0.6,
    methodWeight: 0.4,
  },

  // Backtest settings
  backtest: {
    entrySpreadThreshold: 3, // |spread z-score| > 3 to enter
    minCorrelation: 0.7, // Minimum correlation filter
    takeProfitPercent: 0.5, // 0.5% TP
    stopLossPercent: 0.5, // 0.5% SL
  },
}

export type Config = typeof config

export function getExchangeLabel(exchange: ExchangeType): string {
  return AVAILABLE_EXCHANGES.find(e => e.value === exchange)?.label || exchange
}

export function getTradingViewSymbol(exchange: ExchangeType, symbol: string): string {
  if (exchange === 'tradfi') {
    return symbol
  }
  return `BINANCE:${symbol}`
}

/**
 * Get array of interval values for confluence analysis
 */
export function getConfluenceIntervals(): IntervalType[] {
  return ['5m', '15m', '1h']
}

// Re-export IntervalType from types for external use (they should match)
export type { IntervalType as TypesIntervalType } from '@/types'

/**
 * Calculate approximate time coverage for a given interval and bar count
 */
export function getTimeDescription(interval: IntervalType, bars: number): string {
  const intervalConfig = AVAILABLE_INTERVALS.find(i => i.value === interval)
  if (!intervalConfig) {
    return ''
  }

  const hours = bars / intervalConfig.barsPerHour

  if (hours < 1) {
    return `~${Math.round(hours * 60)} min`
  }
  if (hours < 24) {
    return `~${hours.toFixed(1)} hours`
  }
  const days = hours / 24
  if (days < 30) {
    return `~${days.toFixed(1)} days`
  }
  const months = days / 30
  return `~${months.toFixed(1)} months`
}

/**
 * Get use case description for an interval
 */
export function getIntervalUseCase(interval: IntervalType): string {
  const intervalConfig = AVAILABLE_INTERVALS.find(i => i.value === interval)
  return intervalConfig?.useCase || ''
}
