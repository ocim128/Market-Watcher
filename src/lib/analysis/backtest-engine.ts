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
} from "./statistics"
import type {
    BacktestConfig,
    BacktestResult,
    Trade,
    TradeDirection,
    ExitReason,
    BacktestSummary,
} from "@/types/backtest-types"
import { DEFAULT_BACKTEST_CONFIG, createEmptyBacktestResult } from "@/types/backtest-types"

// Lookback window for rolling Z-score calculations
const ROLLING_WINDOW = 100

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
        const logSpread = Math.log(primaryCloses[i]) - Math.log(secondaryCloses[i])
        spreads.push(logSpread)
    }

    if (spreads.length < 2) return 0

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

/**
 * Run backtest simulation on historical price data
 */
export function runBacktest(
    primaryCloses: number[],
    secondaryCloses: number[],
    symbol: string,
    primarySymbol: string,
    config: Partial<BacktestConfig> = {}
): BacktestResult {
    const fullConfig: BacktestConfig = { ...DEFAULT_BACKTEST_CONFIG, ...config }
    const minLength = Math.min(primaryCloses.length, secondaryCloses.length)

    // Need at least ROLLING_WINDOW + some bars to trade
    if (minLength < ROLLING_WINDOW + 10) {
        return createEmptyBacktestResult(symbol, primarySymbol, fullConfig)
    }

    // Calculate overall correlation once (not rolling per-bar)
    // This determines if the pair is suitable for pair trading
    const alignedPrimary = primaryCloses.slice(-minLength)
    const alignedSecondary = secondaryCloses.slice(-minLength)
    const primaryReturns = calculateReturns(alignedPrimary)
    const secondaryReturns = calculateReturns(alignedSecondary)
    const overallCorrelation = pearsonCorrelation(primaryReturns, secondaryReturns)

    // If overall correlation doesn't meet threshold, no trades for this pair
    if (overallCorrelation < fullConfig.minCorrelation) {
        return createEmptyBacktestResult(symbol, primarySymbol, fullConfig)
    }

    const trades: Trade[] = []
    let inPosition = false
    let currentTrade: Partial<Trade> | null = null

    // Start after we have enough data for rolling calculations
    for (let i = ROLLING_WINDOW; i < minLength; i++) {
        const spreadZ = calculateRollingSpreadZScore(primaryCloses, secondaryCloses, i, ROLLING_WINDOW)

        if (!inPosition) {
            // Check entry condition: |spread Z| > |threshold| (abs protects against negative input)
            const spreadAboveThreshold = Math.abs(spreadZ) > Math.abs(fullConfig.entrySpreadThreshold)

            if (spreadAboveThreshold) {
                // Determine direction based on spread sign
                const direction: TradeDirection = spreadZ > 0 ? 'short_primary' : 'long_primary'

                currentTrade = {
                    entryIndex: i,
                    entrySpread: spreadZ,
                    entryCorrelation: overallCorrelation,
                    entryPrices: {
                        primary: primaryCloses[i],
                        secondary: secondaryCloses[i],
                    },
                    direction,
                }
                inPosition = true
            }
        } else if (currentTrade) {
            // Check exit conditions
            const currentPnL = calculateCombinedPnL(
                currentTrade.direction!,
                currentTrade.entryPrices!.primary,
                currentTrade.entryPrices!.secondary,
                primaryCloses[i],
                secondaryCloses[i]
            )

            let exitReason: ExitReason | null = null

            if (currentPnL >= fullConfig.takeProfitPercent) {
                exitReason = 'take_profit'
            } else if (currentPnL <= -fullConfig.stopLossPercent) {
                exitReason = 'stop_loss'
            }

            if (exitReason) {
                const completedTrade: Trade = {
                    entryIndex: currentTrade.entryIndex!,
                    exitIndex: i,
                    entrySpread: currentTrade.entrySpread!,
                    exitSpread: spreadZ,
                    entryCorrelation: currentTrade.entryCorrelation!,
                    entryPrices: currentTrade.entryPrices!,
                    exitPrices: {
                        primary: primaryCloses[i],
                        secondary: secondaryCloses[i],
                    },
                    direction: currentTrade.direction!,
                    profitPercent: currentPnL,
                    exitReason,
                    durationBars: i - currentTrade.entryIndex!,
                }
                trades.push(completedTrade)
                inPosition = false
                currentTrade = null
            }
        }
    }

    // Close any open position at end of data
    if (inPosition && currentTrade) {
        const lastIdx = minLength - 1
        const finalPnL = calculateCombinedPnL(
            currentTrade.direction!,
            currentTrade.entryPrices!.primary,
            currentTrade.entryPrices!.secondary,
            primaryCloses[lastIdx],
            secondaryCloses[lastIdx]
        )

        const completedTrade: Trade = {
            entryIndex: currentTrade.entryIndex!,
            exitIndex: lastIdx,
            entrySpread: currentTrade.entrySpread!,
            exitSpread: calculateRollingSpreadZScore(primaryCloses, secondaryCloses, lastIdx, ROLLING_WINDOW),
            entryCorrelation: currentTrade.entryCorrelation!,
            entryPrices: currentTrade.entryPrices!,
            exitPrices: {
                primary: primaryCloses[lastIdx],
                secondary: secondaryCloses[lastIdx],
            },
            direction: currentTrade.direction!,
            profitPercent: finalPnL,
            exitReason: 'end_of_data',
            durationBars: lastIdx - currentTrade.entryIndex!,
        }
        trades.push(completedTrade)
    }

    // Calculate summary and equity curve
    const summary = calculateSummary(trades)
    const equityCurve = calculateEquityCurve(trades)

    return {
        symbol,
        primarySymbol,
        config: fullConfig,
        trades,
        summary,
        equityCurve,
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
        if (equity > peak) peak = equity
        const drawdown = peak - equity
        if (drawdown > maxDrawdown) maxDrawdown = drawdown
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
