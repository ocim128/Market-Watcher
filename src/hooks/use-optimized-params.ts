'use client'

import { useCallback, useState } from 'react'
import { buildPriceData, optimizeParameters } from '@/lib/analysis'
import type { BacktestConfig, OptimizedParams } from '@/types/backtest-types'

interface OptimizationSettings {
  trainWindow: number
  testWindow: number
}

interface UseOptimizedParamsReturn {
  optimizedParams: OptimizedParams | null
  settings: OptimizationSettings
  isOptimizing: boolean
  error: string | null
  setSettings: (partial: Partial<OptimizationSettings>) => void
  optimize: (primaryCloses: number[], secondaryCloses: number[]) => void
  applyOptimizedConfig: (onApply: (partial: Partial<BacktestConfig>) => void) => void
  resetOptimization: () => void
}

const DEFAULT_SETTINGS: OptimizationSettings = {
  trainWindow: 500,
  testWindow: 120,
}

export function useOptimizedParams(): UseOptimizedParamsReturn {
  const [optimizedParams, setOptimizedParams] = useState<OptimizedParams | null>(null)
  const [settings, setSettingsState] = useState<OptimizationSettings>(DEFAULT_SETTINGS)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setSettings = useCallback((partial: Partial<OptimizationSettings>) => {
    setSettingsState(prev => ({ ...prev, ...partial }))
  }, [])

  const optimize = useCallback(
    (primaryCloses: number[], secondaryCloses: number[]) => {
      setIsOptimizing(true)
      setError(null)

      setTimeout(() => {
        try {
          const historicalData = buildPriceData(primaryCloses, secondaryCloses)
          const optimized = optimizeParameters(
            historicalData,
            settings.trainWindow,
            settings.testWindow
          )
          setOptimizedParams(optimized)
        } catch (optimizationError) {
          const message =
            optimizationError instanceof Error ? optimizationError.message : 'Optimization failed'
          setError(message)
          setOptimizedParams(null)
        } finally {
          setIsOptimizing(false)
        }
      }, 0)
    },
    [settings.trainWindow, settings.testWindow]
  )

  const applyOptimizedConfig = useCallback(
    (onApply: (partial: Partial<BacktestConfig>) => void) => {
      if (!optimizedParams) {
        return
      }
      onApply(optimizedParams.config)
    },
    [optimizedParams]
  )

  const resetOptimization = useCallback(() => {
    setOptimizedParams(null)
    setError(null)
  }, [])

  return {
    optimizedParams,
    settings,
    isOptimizing,
    error,
    setSettings,
    optimize,
    applyOptimizedConfig,
    resetOptimization,
  }
}
