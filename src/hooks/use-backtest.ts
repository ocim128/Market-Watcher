'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { BacktestConfig, BacktestResult } from '@/types/backtest-types'
import { DEFAULT_BACKTEST_CONFIG, createEmptyBacktestResult } from '@/types/backtest-types'
import { runBacktest } from '@/lib/analysis/backtest-engine'

interface UseBacktestReturn {
  config: BacktestConfig
  setConfig: (config: Partial<BacktestConfig>) => void
  result: BacktestResult | null
  isRunning: boolean
  run: (
    primaryCloses: number[],
    secondaryCloses: number[],
    symbol: string,
    primarySymbol: string,
    runConfig?: BacktestConfig
  ) => void
  reset: () => void
}

export function useBacktest(): UseBacktestReturn {
  const [config, setConfigState] = useState<BacktestConfig>(() => ({ ...DEFAULT_BACKTEST_CONFIG }))
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const configRef = useRef(config)
  const runIdRef = useRef(0)

  useEffect(() => {
    configRef.current = config
  }, [config])

  const setConfig = useCallback((partial: Partial<BacktestConfig>) => {
    setConfigState(prev => ({ ...prev, ...partial }))
  }, [])

  const run = useCallback(
    (
      primaryCloses: number[],
      secondaryCloses: number[],
      symbol: string,
      primarySymbol: string,
      runConfig?: BacktestConfig
    ) => {
      setIsRunning(true)
      const currentRunId = ++runIdRef.current
      const effectiveConfig = { ...(runConfig ?? configRef.current) }

      // Run in next tick to allow UI to update
      setTimeout(() => {
        if (currentRunId !== runIdRef.current) {
          return
        }

        try {
          const backtestResult = runBacktest(
            primaryCloses,
            secondaryCloses,
            symbol,
            primarySymbol,
            effectiveConfig
          )
          if (currentRunId === runIdRef.current) {
            setResult(backtestResult)
          }
        } catch (error) {
          console.error('Backtest error:', error)
          if (currentRunId === runIdRef.current) {
            setResult(createEmptyBacktestResult(symbol, primarySymbol, effectiveConfig))
          }
        } finally {
          if (currentRunId === runIdRef.current) {
            setIsRunning(false)
          }
        }
      }, 0)
    },
    []
  )

  const reset = useCallback(() => {
    runIdRef.current += 1
    setIsRunning(false)
    setResult(null)
    setConfigState({ ...DEFAULT_BACKTEST_CONFIG })
  }, [])

  return {
    config,
    setConfig,
    result,
    isRunning,
    run,
    reset,
  }
}
