/**
 * useScan Hook - React hook for scan operations
 *
 * This hook provides the same API as the old useScan() from context,
 * but uses Zustand for state management. This allows for:
 * - Better performance (no unnecessary re-renders)
 * - No provider wrapper needed
 * - Easier testing
 */

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useScanStore, ScanOptions, ScanResult } from '../store/scan-store'
import { executeScan, analyzeScanResults } from '../lib/scan-service'

/**
 * Hook for scanning and analyzing trading pairs
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { scan, isScanning, analysisResults } = useScan()
 *
 *   return (
 *     <button onClick={() => scan()} disabled={isScanning}>
 *       {isScanning ? 'Scanning...' : 'Scan'}
 *     </button>
 *   )
 * }
 * ```
 */
export function useScan() {
  const queryClient = useQueryClient()

  // Get state from Zustand store
  const progress = useScanStore(state => state.progress)
  const results = useScanStore(state => state.results)
  const analysisResults = useScanStore(state => state.analysisResults)
  const currentPrimaryPair = useScanStore(state => state.currentPrimaryPair)
  const lastScanTime = useScanStore(state => state.lastScanTime)
  const isScanning = useScanStore(state => state.isScanning)
  const isAnalyzing = useScanStore(state => state.isAnalyzing)
  const isComplete = useScanStore(state => state.isComplete)
  const isError = useScanStore(state => state.isError)

  // Get actions from Zustand store
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

  /**
   * Execute a scan operation
   *
   * Fetches klines for top pairs and optionally analyzes them
   */
  const scan = useCallback(
    async (options: ScanOptions = {}): Promise<ScanResult[]> => {
      const primaryPair = options.primaryPair || currentPrimaryPair

      // Update current primary pair if changed
      if (options.primaryPair && options.primaryPair !== currentPrimaryPair) {
        setCurrentPrimaryPair(options.primaryPair)
      }

      // Start scan
      startScan()

      // Execute scan
      const { results: scanResults, error } = await executeScan(
        options,
        queryClient,
        updateScanProgress
      )

      if (error) {
        setError(error)
        throw new Error(error)
      }

      // Update results
      setResults(scanResults)
      completeScan()

      // Auto-analyze if requested
      if (options.autoAnalyze !== false && scanResults.length > 0) {
        setTimeout(() => {
          startAnalysis()
          const analyzed = analyzeScanResults(scanResults, primaryPair)
          setAnalysisResults(analyzed)
          completeAnalysis()
        }, 100)
      }

      return scanResults
    },
    [
      queryClient,
      currentPrimaryPair,
      startScan,
      setCurrentPrimaryPair,
      updateScanProgress,
      setError,
      setResults,
      completeScan,
      startAnalysis,
      setAnalysisResults,
      completeAnalysis,
    ]
  )

  /**
   * Analyze existing scan results
   *
   * Useful for re-analyzing with different parameters
   */
  const analyze = useCallback(() => {
    if (results.length === 0) {
      console.warn('No results to analyze')
      return
    }

    startAnalysis()

    try {
      const analyzed = analyzeScanResults(results, currentPrimaryPair)
      setAnalysisResults(analyzed)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      completeAnalysis()
    }
  }, [results, currentPrimaryPair, startAnalysis, setAnalysisResults, completeAnalysis])

  return {
    // State
    progress,
    results,
    analysisResults,
    currentPrimaryPair,
    setCurrentPrimaryPair,
    lastScanTime,

    // Computed states
    isScanning,
    isAnalyzing,
    isComplete,
    isError,

    // Actions
    scan,
    analyze,
    reset,
  }
}
