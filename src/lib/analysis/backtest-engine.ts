/**
 * Backtest Engine for Pair Trading Strategy
 *
 * Simulates pair trading based on:
 * - Entry: |spread z-score| > threshold AND correlation >= minCorrelation
 * - Exit: Combined P&L hits TP (+X%) or SL (-X%)
 *
 * Position Logic:
 * - If spread > +threshold: SHORT primary, LONG secondary (expect mean reversion down)
 * - If spread < -threshold: LONG primary, SHORT secondary (expect mean reversion up)
 */

import {
  mean,
  standardDeviation,
  pearsonCorrelation,
  calculateReturns,
  alignSeries,
} from './statistics'
import { runScannerBacktestForCandles } from '@/lib/scanner/scanner-backtest'
import type {
  BacktestConfig,
  BacktestResult,
  Trade,
  TradeDirection,
  ExitReason,
  BacktestSummary,
} from '@/types/backtest-types'
import type { BinanceKline } from '@/types'
import type { MomentumBacktestConfig, ScannerBacktestResult } from '@/lib/scanner/types'
import { DEFAULT_BACKTEST_CONFIG, createEmptyBacktestResult } from '@/types/backtest-types'

// Lookback window for rolling Z-score calculations
const ROLLING_WINDOW = 100
const EPSILON = 1e-12

/**
 * Calculate rolling Z-score of the log spread
 */
function calculateRollingSpreadZScore(
  primaryCloses: number[],
  secondaryCloses: number[],
  index: number,
  windowSize: number
): number {
  const startIdx = Math.max(0, index - windowSize + 1)
  const spreads: number[] = []

  for (let i = startIdx; i <= index; i++) {
    const logSpread =
      Math.log(Math.max(EPSILON, primaryCloses[i])) -
      Math.log(Math.max(EPSILON, secondaryCloses[i]))
    spreads.push(logSpread)
  }

  if (spreads.length < 2) {
    return 0
  }

  const spreadMean = mean(spreads)
  const spreadStd = standardDeviation(spreads, spreadMean)
  const currentSpread = spreads[spreads.length - 1]

  return spreadStd > 1e-12 ? (currentSpread - spreadMean) / spreadStd : 0
}

/**
 * Calculate combined P&L for a pair trade
 *
 * For LONG_PRIMARY (spread < -threshold, expecting spread to rise):
 *   - LONG primary: (exitPrimary - entryPrimary) / entryPrimary
 *   - SHORT secondary: (entrySecondary - exitSecondary) / entrySecondary
 *   - Combined: (longPnL + shortPnL) / 2
 *
 * For SHORT_PRIMARY (spread > +threshold, expecting spread to fall):
 *   - SHORT primary: (entryPrimary - exitPrimary) / entryPrimary
 *   - LONG secondary: (exitSecondary - entrySecondary) / entrySecondary
 *   - Combined: (shortPnL + longPnL) / 2
 */
function calculateCombinedPnL(
  direction: TradeDirection,
  entryPrimary: number,
  entrySecondary: number,
  exitPrimary: number,
  exitSecondary: number
): number {
  if (direction === 'long_primary') {
    // Long primary, short secondary
    const primaryPnL = (exitPrimary - entryPrimary) / entryPrimary
    const secondaryPnL = (entrySecondary - exitSecondary) / entrySecondary
    return ((primaryPnL + secondaryPnL) / 2) * 100 // Convert to percentage
  } else {
    // Short primary, long secondary
    const primaryPnL = (entryPrimary - exitPrimary) / entryPrimary
    const secondaryPnL = (exitSecondary - entrySecondary) / entrySecondary
    return ((primaryPnL + secondaryPnL) / 2) * 100 // Convert to percentage
  }
}

function checkEntryCondition(
  spreadZ: number,
  threshold: number,
  inPosition: boolean
): { shouldEnter: boolean; direction: TradeDirection | null } {
  if (inPosition) {
    return { shouldEnter: false, direction: null }
  }
  const spreadAboveThreshold = Math.abs(spreadZ) > Math.abs(threshold)
  if (!spreadAboveThreshold) {
    return { shouldEnter: false, direction: null }
  }
  return { shouldEnter: true, direction: spreadZ > 0 ? 'short_primary' : 'long_primary' }
}

function checkExitCondition(currentPnL: number, config: BacktestConfig): ExitReason | null {
  if (currentPnL >= config.takeProfitPercent) {
    return 'take_profit'
  }
  if (currentPnL <= -config.stopLossPercent) {
    return 'stop_loss'
  }
  return null
}

function createTrade(
  entry: Partial<Trade>,
  exitIndex: number,
  exitSpread: number,
  profitPercent: number,
  exitReason: ExitReason,
  primaryCloses: number[],
  secondaryCloses: number[]
): Trade {
  return {
    entryIndex: entry.entryIndex!,
    exitIndex,
    entrySpread: entry.entrySpread!,
    exitSpread,
    entryCorrelation: entry.entryCorrelation!,
    entryPrices: entry.entryPrices!,
    exitPrices: { primary: primaryCloses[exitIndex], secondary: secondaryCloses[exitIndex] },
    direction: entry.direction!,
    profitPercent,
    exitReason,
    durationBars: exitIndex - entry.entryIndex!,
  }
}

function runBacktestIteration(
  primaryCloses: number[],
  secondaryCloses: number[],
  minLength: number,
  config: BacktestConfig,
  overallCorrelation: number,
  trades: Trade[]
): void {
  let inPosition = false
  let currentTrade: Partial<Trade> | null = null

  for (let i = ROLLING_WINDOW - 1; i < minLength; i++) {
    const spreadZ = calculateRollingSpreadZScore(primaryCloses, secondaryCloses, i, ROLLING_WINDOW)
    if (!Number.isFinite(spreadZ)) {
      continue
    }

    if (!inPosition) {
      const { shouldEnter, direction } = checkEntryCondition(
        spreadZ,
        config.entrySpreadThreshold,
        inPosition
      )
      if (shouldEnter && direction) {
        currentTrade = {
          entryIndex: i,
          entrySpread: spreadZ,
          entryCorrelation: overallCorrelation,
          entryPrices: { primary: primaryCloses[i], secondary: secondaryCloses[i] },
          direction,
        }
        inPosition = true
      }
    } else if (currentTrade) {
      const currentPnL = calculateCombinedPnL(
        currentTrade.direction!,
        currentTrade.entryPrices!.primary,
        currentTrade.entryPrices!.secondary,
        primaryCloses[i],
        secondaryCloses[i]
      )
      if (!Number.isFinite(currentPnL)) {
        continue
      }

      const exitReason = checkExitCondition(currentPnL, config)
      if (exitReason) {
        trades.push(
          createTrade(
            currentTrade,
            i,
            spreadZ,
            currentPnL,
            exitReason,
            primaryCloses,
            secondaryCloses
          )
        )
        inPosition = false
        currentTrade = null
      }
    }
  }

  if (inPosition && currentTrade) {
    const lastIdx = minLength - 1
    const finalPnL = calculateCombinedPnL(
      currentTrade.direction!,
      currentTrade.entryPrices!.primary,
      currentTrade.entryPrices!.secondary,
      primaryCloses[lastIdx],
      secondaryCloses[lastIdx]
    )
    const finalSpreadZ = calculateRollingSpreadZScore(
      primaryCloses,
      secondaryCloses,
      lastIdx,
      ROLLING_WINDOW
    )
    trades.push(
      createTrade(
        currentTrade,
        lastIdx,
        finalSpreadZ,
        finalPnL,
        'end_of_data',
        primaryCloses,
        secondaryCloses
      )
    )
  }
}

export function runBacktest(
  primaryCloses: number[],
  secondaryCloses: number[],
  symbol: string,
  primarySymbol: string,
  config: Partial<BacktestConfig> = {}
): BacktestResult {
  const fullConfig: BacktestConfig = { ...DEFAULT_BACKTEST_CONFIG, ...config }
  const { primary: alignedPrimary, secondary: alignedSecondary } = alignSeries(
    primaryCloses,
    secondaryCloses,
    { requirePositive: true }
  )
  const minLength = Math.min(alignedPrimary.length, alignedSecondary.length)

  if (minLength < ROLLING_WINDOW + 10) {
    return createEmptyBacktestResult(symbol, primarySymbol, fullConfig)
  }

  const overallCorrelation = pearsonCorrelation(
    calculateReturns(alignedPrimary),
    calculateReturns(alignedSecondary)
  )

  if (overallCorrelation < fullConfig.minCorrelation) {
    return createEmptyBacktestResult(symbol, primarySymbol, fullConfig)
  }

  const trades: Trade[] = []
  runBacktestIteration(
    alignedPrimary,
    alignedSecondary,
    minLength,
    fullConfig,
    overallCorrelation,
    trades
  )

  return {
    symbol,
    primarySymbol,
    config: fullConfig,
    trades,
    summary: calculateSummary(trades),
    equityCurve: calculateEquityCurve(trades),
    timestamp: Date.now(),
  }
}

/**
 * Calculate summary statistics from trades
 */
function calculateSummary(trades: Trade[]): BacktestSummary {
  if (trades.length === 0) {
    return {
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
    }
  }

  const winningTrades = trades.filter(t => t.profitPercent > 0)
  const losingTrades = trades.filter(t => t.profitPercent <= 0)

  const totalProfit = trades.reduce((sum, t) => sum + t.profitPercent, 0)
  const totalDuration = trades.reduce((sum, t) => sum + t.durationBars, 0)

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.profitPercent, 0)
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitPercent, 0))

  const profits = trades.map(t => t.profitPercent)
  const largestWin = profits.length > 0 ? Math.max(...profits) : 0
  const largestLoss = profits.length > 0 ? Math.min(...profits) : 0

  // Calculate max drawdown from equity curve
  const equityCurve = calculateEquityCurve(trades)
  let maxDrawdown = 0
  let peak = 0
  for (const equity of equityCurve) {
    if (equity > peak) {
      peak = equity
    }
    const drawdown = peak - equity
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
    }
  }

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: (winningTrades.length / trades.length) * 100,
    totalProfitPercent: totalProfit,
    averageProfitPercent: totalProfit / trades.length,
    maxDrawdownPercent: maxDrawdown,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    averageDurationBars: totalDuration / trades.length,
    largestWin,
    largestLoss,
  }
}

/**
 * Calculate cumulative equity curve
 */
function calculateEquityCurve(trades: Trade[]): number[] {
  const curve: number[] = [0] // Start at 0
  let cumulative = 0

  for (const trade of trades) {
    cumulative += trade.profitPercent
    curve.push(cumulative)
  }

  return curve
}

/**
 * Run backtest on multiple pairs
 */
export function runBacktestAllPairs(
  primaryCloses: number[],
  pairsData: Array<{ symbol: string; closes: number[] }>,
  primarySymbol: string,
  config: Partial<BacktestConfig> = {}
): BacktestResult[] {
  return pairsData.map(pair =>
    runBacktest(primaryCloses, pair.closes, pair.symbol, primarySymbol, config)
  )
}

export type BacktestStrategyMode = 'pair_spread' | 'momentum_rsi'

interface PairSpreadBacktestInput {
  mode?: 'pair_spread'
  primaryCloses: number[]
  secondaryCloses: number[]
  symbol: string
  primarySymbol: string
  config?: Partial<BacktestConfig>
}

interface MomentumRsiBacktestInput {
  mode: 'momentum_rsi'
  symbol: string
  candles: BinanceKline[]
  config?: Partial<MomentumBacktestConfig>
}

export function runBacktestByMode(
  input: PairSpreadBacktestInput | MomentumRsiBacktestInput
): BacktestResult | ScannerBacktestResult {
  if (input.mode === 'momentum_rsi') {
    return runScannerBacktestForCandles(input.symbol, input.candles, input.config)
  }

  return runBacktest(
    input.primaryCloses,
    input.secondaryCloses,
    input.symbol,
    input.primarySymbol,
    input.config
  )
}
