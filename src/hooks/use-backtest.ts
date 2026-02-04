'use client'

import { useState, useCallback } from 'react'
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
    primarySymbol: string
  ) => void
  reset: () => void
}

export function useBacktest(): UseBacktestReturn {
  const [config, setConfigState] = useState<BacktestConfig>(DEFAULT_BACKTEST_CONFIG)
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const setConfig = useCallback((partial: Partial<BacktestConfig>) => {
    setConfigState(prev => ({ ...prev, ...partial }))
  }, [])

  const run = useCallback(
    (primaryCloses: number[], secondaryCloses: number[], symbol: string, primarySymbol: string) => {
      setIsRunning(true)

      // Run in next tick to allow UI to update
      setTimeout(() => {
        try {
          const backtestResult = runBacktest(
            primaryCloses,
            secondaryCloses,
            symbol,
            primarySymbol,
            config
          )
          setResult(backtestResult)
        } catch (error) {
          console.error('Backtest error:', error)
          setResult(createEmptyBacktestResult(symbol, primarySymbol, config))
        } finally {
          setIsRunning(false)
        }
      }, 0)
    },
    [config]
  )

  const reset = useCallback(() => {
    setResult(null)
    setConfigState(DEFAULT_BACKTEST_CONFIG)
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
