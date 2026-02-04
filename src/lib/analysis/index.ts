// Analysis Engine
// Statistical analysis functions for pair trading

export { analyzePair, analyzeAllPairs } from './pair-analysis'
export type { AnalyzeOptions } from './pair-analysis'

export { calculateCorrelationVelocity } from './correlation-velocity'
export { calculateVolatilityAdjustedSpread } from './volatility-spread'
export { buildNotes } from './notes-builder'
export { runBacktest, runBacktestAllPairs } from './backtest-engine'

export {
  mean,
  standardDeviation,
  pearsonCorrelation,
  calculateReturns,
  calculateSpread,
  calculateRatio,
  clamp,
} from './statistics'

export { analyzeMultiTimeframeConfluence } from './multi-timeframe'
