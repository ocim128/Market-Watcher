/**
 * Backtest Types for Pair Trading Strategy
 *
 * Strategy:
 * - Entry: |spread z-score| > threshold AND correlation >= minCorrelation
 * - Exit: TP at +X% or SL at -X% (combined long/short P&L)
 */

// Configuration for backtest parameters (all configurable)
export interface BacktestConfig {
  /** Entry when |spread z-score| > threshold (default: 3) */
  entrySpreadThreshold: number
  /** Minimum correlation to allow entry (default: 0.7) */
  minCorrelation: number
  /** Take profit percentage (default: 0.5%) */
  takeProfitPercent: number
  /** Stop loss percentage (default: 0.5%) */
  stopLossPercent: number
}

export interface PriceData {
  primaryClose: number
  secondaryClose: number
  timestamp?: number
}

export interface WalkForwardWindowResult {
  windowIndex: number
  trainStart: number
  trainEnd: number
  testStart: number
  testEnd: number
  selectedConfig: BacktestConfig
  trainScore: number
  testScore: number
  testSummary: BacktestSummary
}

export interface OptimizedParams {
  config: BacktestConfig
  confidence: 'high' | 'medium' | 'low'
  windowsEvaluated: number
  trainWindow: number
  testWindow: number
  forwardScore: number
  walkForwardProfitPercent: number
  walkForwardWinRate: number
  walkForwardTrades: number
  baselineProfitPercent: number
  improvementPercent: number
  windowResults: WalkForwardWindowResult[]
}

// Default backtest configuration
export const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  entrySpreadThreshold: 3,
  minCorrelation: 0.7,
  takeProfitPercent: 0.5,
  stopLossPercent: 0.5,
}

// Trade direction based on spread
export type TradeDirection = 'long_primary' | 'short_primary'

// Reason for exiting a trade
export type ExitReason = 'take_profit' | 'stop_loss' | 'end_of_data'

// Individual trade record
export interface Trade {
  /** Bar index when trade was opened */
  entryIndex: number
  /** Bar index when trade was closed */
  exitIndex: number
  /** Spread z-score at entry */
  entrySpread: number
  /** Spread z-score at exit */
  exitSpread: number
  /** Correlation at entry */
  entryCorrelation: number
  /** Prices at entry */
  entryPrices: {
    primary: number
    secondary: number
  }
  /** Prices at exit */
  exitPrices: {
    primary: number
    secondary: number
  }
  /** Trade direction based on spread */
  direction: TradeDirection
  /** Combined P&L percentage (long leg + short leg) / 2 */
  profitPercent: number
  /** Why the trade was closed */
  exitReason: ExitReason
  /** Duration in bars */
  durationBars: number
}

// Summary statistics for backtest results
export interface BacktestSummary {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalProfitPercent: number
  averageProfitPercent: number
  maxDrawdownPercent: number
  profitFactor: number
  averageDurationBars: number
  largestWin: number
  largestLoss: number
}

// Complete backtest results
export interface BacktestResult {
  /** Symbol being backtested */
  symbol: string
  /** Primary symbol (e.g., ETHUSDT) */
  primarySymbol: string
  /** Configuration used */
  config: BacktestConfig
  /** Individual trades */
  trades: Trade[]
  /** Summary statistics */
  summary: BacktestSummary
  /** Equity curve (cumulative P&L at each trade) */
  equityCurve: number[]
  /** Timestamp when backtest was run */
  timestamp: number
}

// Empty/initial backtest result
export function createEmptyBacktestResult(
  symbol: string,
  primarySymbol: string,
  config: BacktestConfig
): BacktestResult {
  return {
    symbol,
    primarySymbol,
    config,
    trades: [],
    summary: {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalProfitPercent: 0,
      averageProfitPercent: 0,
      maxDrawdownPercent: 0,
      profitFactor: 0,
      averageDurationBars: 0,
      largestWin: 0,
      largestLoss: 0,
    },
    equityCurve: [],
    timestamp: Date.now(),
  }
}
