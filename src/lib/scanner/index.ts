export { CandleStore, getCandleStore, createMemoryCandleStore } from './candle-store'
export { CandleDownloader, createCandleDownloader } from './candle-downloader'
export {
  UniverseBuilder,
  createUniverseBuilder,
  buildUniverseEntryFromCandles,
  rankUniverseEntries,
  calculatePerformancePercent,
  scoreUniverseEntry,
} from './universe-builder'
export { calculateRSI, detectRSICrossover } from './rsi-calculator'
export { scanForSignals, rateSignal, evaluateSignalOutcome } from './signal-generator'
export { runScannerBacktest, runScannerBacktestForCandles } from './scanner-backtest'
export {
  loadSignalHistory,
  saveSignalHistory,
  clearSignalHistory,
  mergeSignalHistory,
  getSignalHistoryStats,
  reevaluateSignalRecords,
} from './signal-history'
export type {
  CandleStoreLike,
  UniverseEntry,
  UniverseSettings,
  UniverseSnapshot,
  ScannerThresholds,
  Signal,
  SignalHistoryRecord,
  MarketContext,
  CrossoverEvent,
  CandleDownloadSummary,
  ScannerBacktestResult,
  ScannerBacktestStats,
  ScannerBacktestTrade,
  MomentumBacktestConfig,
} from './types'
export { DEFAULT_SCANNER_SETTINGS, DEFAULT_MOMENTUM_BACKTEST_CONFIG } from './types'
