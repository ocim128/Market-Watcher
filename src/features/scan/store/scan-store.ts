/**
 * Scan Store - Zustand state management for pair scanning
 *
 * This store manages the state for scanning trading pairs from supported sources,
 * caching results, and analyzing them for trading opportunities.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { config, type ExchangeType, type ScanMode } from '@/config'
import type { ScanProgress, BinanceKline, PairAnalysisResult } from '@/types'

export interface ScanResult {
  symbol: string
  klines: BinanceKline[]
  closePrices: number[]
}

export interface ScanOptions {
  limit?: number
  interval?: string
  totalBars?: number
  primaryPair?: string
  scanMode?: ScanMode
  exchange?: ExchangeType
  concurrency?: number
  includePrimary?: boolean
  autoAnalyze?: boolean
}

interface ScanState {
  // Core state
  progress: ScanProgress
  results: ScanResult[]
  analysisResults: PairAnalysisResult[]
  currentPrimaryPair: string
  currentScanMode: ScanMode
  currentExchange: ExchangeType
  lastScanTime: Date | null

  // Loading states
  isAnalyzing: boolean

  // Computed states (derived from progress.status)
  isScanning: boolean
  isComplete: boolean
  isError: boolean
}

interface ScanActions {
  // State setters
  setProgress: (progress: ScanProgress) => void
  setResults: (results: ScanResult[]) => void
  setAnalysisResults: (results: PairAnalysisResult[]) => void
  setCurrentPrimaryPair: (pair: string) => void
  setCurrentScanMode: (mode: ScanMode) => void
  setCurrentExchange: (exchange: ExchangeType) => void
  setIsAnalyzing: (isAnalyzing: boolean) => void
  setLastScanTime: (time: Date | null) => void

  // Action setters
  startScan: () => void
  completeScan: () => void
  setError: (error: string) => void
  reset: () => void

  // Analysis actions
  startAnalysis: () => void
  completeAnalysis: () => void

  // Batch updates
  updateScanProgress: (current: number, total: number, currentSymbol: string) => void
}

const initialProgress: ScanProgress = {
  current: 0,
  total: 0,
  currentSymbol: '',
  status: 'idle',
}

const initialState: Omit<ScanState, keyof ScanActions> = {
  progress: initialProgress,
  results: [],
  analysisResults: [],
  currentPrimaryPair: config.primaryPair,
  currentScanMode: config.scanMode,
  currentExchange: config.exchange,
  lastScanTime: null,
  isAnalyzing: false,
  isScanning: false,
  isComplete: false,
  isError: false,
}

export const useScanStore = create<ScanState & ScanActions>()(
  devtools(
    (set, _get) => ({
      ...initialState,

      // State setters
      setProgress: progress =>
        set({
          progress,
          isScanning: progress.status === 'scanning',
          isComplete: progress.status === 'complete',
          isError: progress.status === 'error',
        }),

      setResults: results => set({ results }),

      setAnalysisResults: analysisResults => set({ analysisResults }),

      setCurrentPrimaryPair: currentPrimaryPair => set({ currentPrimaryPair }),

      setCurrentScanMode: currentScanMode => set({ currentScanMode }),

      setCurrentExchange: currentExchange => set({ currentExchange }),

      setIsAnalyzing: isAnalyzing => set({ isAnalyzing }),

      setLastScanTime: lastScanTime => set({ lastScanTime }),

      // Action setters
      startScan: () =>
        set({
          progress: {
            current: 0,
            total: 0,
            currentSymbol: 'Fetching pairs...',
            status: 'scanning',
          },
          isScanning: true,
          isComplete: false,
          isError: false,
          results: [],
          analysisResults: [],
        }),

      completeScan: () =>
        set(state => ({
          progress: { ...state.progress, status: 'complete' },
          isScanning: false,
          isComplete: true,
          lastScanTime: new Date(),
        })),

      setError: error =>
        set(state => ({
          progress: { ...state.progress, status: 'error', error },
          isScanning: false,
          isError: true,
        })),

      reset: () => set(initialState),

      // Analysis actions
      startAnalysis: () => set({ isAnalyzing: true }),

      completeAnalysis: () => set({ isAnalyzing: false }),

      // Batch updates
      updateScanProgress: (current, total, currentSymbol) =>
        set(state => ({
          progress: {
            ...state.progress,
            current,
            total,
            currentSymbol,
          },
        })),
    }),
    { name: 'ScanStore' }
  )
)

// Selectors for better performance
export const selectScanProgress = (state: ScanState & ScanActions) => state.progress
export const selectScanResults = (state: ScanState & ScanActions) => state.results
export const selectAnalysisResults = (state: ScanState & ScanActions) => state.analysisResults
export const selectCurrentPrimaryPair = (state: ScanState & ScanActions) => state.currentPrimaryPair
export const selectCurrentScanMode = (state: ScanState & ScanActions) => state.currentScanMode
export const selectCurrentExchange = (state: ScanState & ScanActions) => state.currentExchange
export const selectIsScanning = (state: ScanState & ScanActions) => state.isScanning
export const selectIsAnalyzing = (state: ScanState & ScanActions) => state.isAnalyzing
export const selectIsComplete = (state: ScanState & ScanActions) => state.isComplete
export const selectIsError = (state: ScanState & ScanActions) => state.isError
export const selectLastScanTime = (state: ScanState & ScanActions) => state.lastScanTime
