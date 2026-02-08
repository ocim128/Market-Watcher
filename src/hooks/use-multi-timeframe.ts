'use client'

import { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { performMtfScan } from '@/lib/analysis/mtf-helpers'
import type { ConfluenceResult } from '@/lib/analysis/multi-timeframe'
import { config, type ScanMode } from '@/config'

interface MultiTimeframeProgress {
  currentPair: number
  totalPairs: number
  currentSymbol: string
  currentInterval: string
  completedIntervals: number
  totalIntervals: number
  status: 'idle' | 'scanning' | 'complete' | 'error'
  error?: string
}

interface UseMultiTimeframeReturn {
  scan: (options?: MultiTimeframeScanOptions) => Promise<ConfluenceResult[]>
  reset: () => void
  progress: MultiTimeframeProgress
  results: ConfluenceResult[]
  isScanning: boolean
  isComplete: boolean
  isError: boolean
}

interface MultiTimeframeScanOptions {
  limit?: number
  intervals?: string[]
  totalBars?: number
  primaryPair?: string
  scanMode?: ScanMode
  concurrency?: number
}

const DEFAULT_INTERVALS: string[] = ['5m', '15m', '1h']

export function useMultiTimeframe(): UseMultiTimeframeReturn {
  const queryClient = useQueryClient()
  const scanLockRef = useRef(false)
  const [progress, setProgress] = useState<MultiTimeframeProgress>({
    currentPair: 0,
    totalPairs: 0,
    currentSymbol: '',
    currentInterval: '1h',
    completedIntervals: 0,
    totalIntervals: 0,
    status: 'idle',
  })
  const [results, setResults] = useState<ConfluenceResult[]>([])

  const scan = useCallback(
    async (options: MultiTimeframeScanOptions = {}) => {
      if (scanLockRef.current) {
        return []
      }
      scanLockRef.current = true

      const opts = {
        limit: 50,
        intervals: DEFAULT_INTERVALS,
        totalBars: 200,
        primaryPair: config.primaryPair,
        scanMode: config.scanMode,
        concurrency: 5,
        ...options,
      }
      setProgress(p => ({
        ...p,
        status: 'scanning',
        currentSymbol: 'Starting...',
        currentPair: 0,
        totalPairs: 0,
        completedIntervals: 0,
        totalIntervals: 0,
      }))
      setResults([])

      try {
        const confluenceResults = await performMtfScan(
          opts,
          queryClient,
          (completedCount, currentSymbol, totalSymbols) => {
            setProgress(p => ({
              ...p,
              currentPair: completedCount,
              totalPairs: totalSymbols,
              currentSymbol,
              completedIntervals: completedCount * opts.intervals.length,
              totalIntervals: totalSymbols * opts.intervals.length,
            }))
          }
        )

        setResults(confluenceResults)
        setProgress(p => ({ ...p, status: 'complete', currentSymbol: 'Done' }))
        return confluenceResults
      } catch (error) {
        setProgress(p => ({
          ...p,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
        throw error
      } finally {
        scanLockRef.current = false
      }
    },
    [queryClient]
  )

  const reset = useCallback(() => {
    scanLockRef.current = false
    setProgress({
      currentPair: 0,
      totalPairs: 0,
      currentSymbol: '',
      currentInterval: '1h',
      completedIntervals: 0,
      totalIntervals: 0,
      status: 'idle',
    })
    setResults([])
  }, [])

  return {
    scan,
    reset,
    progress,
    results,
    isScanning: progress.status === 'scanning',
    isComplete: progress.status === 'complete',
    isError: progress.status === 'error',
  }
}
