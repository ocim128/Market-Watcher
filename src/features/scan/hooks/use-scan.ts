import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useScanStore, ScanOptions, ScanResult } from '../store/scan-store'
import { executeScan, analyzeScanResults } from '../lib/scan-service'

function useScanState() {
  const progress = useScanStore(state => state.progress)
  const results = useScanStore(state => state.results)
  const analysisResults = useScanStore(state => state.analysisResults)
  const currentPrimaryPair = useScanStore(state => state.currentPrimaryPair)
  const lastScanTime = useScanStore(state => state.lastScanTime)
  const isScanning = useScanStore(state => state.isScanning)
  const isAnalyzing = useScanStore(state => state.isAnalyzing)
  const isComplete = useScanStore(state => state.isComplete)
  const isError = useScanStore(state => state.isError)

  return {
    progress,
    results,
    analysisResults,
    currentPrimaryPair,
    lastScanTime,
    isScanning,
    isAnalyzing,
    isComplete,
    isError,
  }
}

function useScanActions() {
  const startScan = useScanStore(state => state.startScan)
  const completeScan = useScanStore(state => state.completeScan)
  const setError = useScanStore(state => state.setError)
  const setResults = useScanStore(state => state.setResults)
  const setAnalysisResults = useScanStore(state => state.setAnalysisResults)
  const setCurrentPrimaryPair = useScanStore(state => state.setCurrentPrimaryPair)
  const updateScanProgress = useScanStore(state => state.updateScanProgress)
  const startAnalysis = useScanStore(state => state.startAnalysis)
  const completeAnalysis = useScanStore(state => state.completeAnalysis)
  const reset = useScanStore(state => state.reset)

  return {
    startScan,
    completeScan,
    setError,
    setResults,
    setAnalysisResults,
    setCurrentPrimaryPair,
    updateScanProgress,
    startAnalysis,
    completeAnalysis,
    reset,
  }
}

export function useScan() {
  const queryClient = useQueryClient()
  const state = useScanState()
  const actions = useScanActions()

  const scan = useCallback(
    async (options: ScanOptions = {}): Promise<ScanResult[]> => {
      const primaryPair = options.primaryPair || state.currentPrimaryPair

      if (options.primaryPair && options.primaryPair !== state.currentPrimaryPair) {
        actions.setCurrentPrimaryPair(options.primaryPair)
      }

      actions.startScan()
      const { results: scanResults, error } = await executeScan(
        options,
        queryClient,
        actions.updateScanProgress
      )

      if (error) {
        actions.setError(error)
        throw new Error(error)
      }

      actions.setResults(scanResults)
      actions.completeScan()

      if (options.autoAnalyze !== false && scanResults.length > 0) {
        setTimeout(() => {
          actions.startAnalysis()
          const analyzed = analyzeScanResults(scanResults, primaryPair)
          actions.setAnalysisResults(analyzed)
          actions.completeAnalysis()
        }, 100)
      }

      return scanResults
    },
    [queryClient, state.currentPrimaryPair, actions]
  )

  const analyze = useCallback(() => {
    if (state.results.length === 0) {
      console.warn('No results to analyze')
      return
    }

    actions.startAnalysis()
    try {
      const analyzed = analyzeScanResults(state.results, state.currentPrimaryPair)
      actions.setAnalysisResults(analyzed)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      actions.completeAnalysis()
    }
  }, [state.results, state.currentPrimaryPair, actions])

  return {
    ...state,
    setCurrentPrimaryPair: actions.setCurrentPrimaryPair,
    scan,
    analyze,
    reset: actions.reset,
  }
}
