/**
 * Constants for multi-timeframe panel
 */

import { getScalpingIntervals, isBinanceNativeInterval } from '@/lib/binance/resample'

export const CONFIDENCE_COLORS = {
  high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  mixed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
} as const

export const CONFIDENCE_EMOJI = {
  high: '🟢',
  medium: '🟡',
  low: '🟠',
  mixed: '🔴',
} as const

export type PresetKey = 'scalping' | 'ultra' | 'intraday' | 'advanced' | 'custom'

export interface PresetConfig {
  name: string
  intervals: string[]
  bars: number
  description: string
}

export const PANEL_PRESETS: Record<PresetKey, PresetConfig> = {
  ultra: {
    name: 'Ultra Scalp (1m-5m)',
    intervals: ['1m', '2m', '3m', '4m', '5m'],
    bars: 200,
    description: 'Every 1-minute step for maximum precision',
  },
  scalping: {
    name: 'Scalping (1m-15m)',
    intervals: ['1m', '3m', '5m', '7m', '10m', '15m'],
    bars: 200,
    description: 'Optimal scalping timeframes with custom intervals',
  },
  intraday: {
    name: 'Intraday (5m-4h)',
    intervals: ['5m', '15m', '30m', '1h', '4h'],
    bars: 300,
    description: 'Standard intraday/swing trading timeframes',
  },
  advanced: {
    name: 'Advanced (All 1m-15m)',
    intervals: ['1m', '2m', '3m', '4m', '5m', '6m', '7m', '8m', '9m', '10m', '15m'],
    bars: 150,
    description: 'All intervals from 1m to 15m (slower but comprehensive)',
  },
  custom: {
    name: 'Custom',
    intervals: ['1m', '3m', '5m', '15m'],
    bars: 200,
    description: 'User-defined configuration',
  },
}

export const ALL_INTERVALS = getScalpingIntervals().map(i => ({
  value: i.value,
  label: i.label,
  description: i.description,
  isNative: isBinanceNativeInterval(i.value),
}))

/**
 * Sort intervals by minutes value
 */
export function sortIntervals(intervals: string[]): string[] {
  return [...intervals].sort((a, b) => {
    const getMinutes = (int: string) => {
      const val = parseInt(int)
      const unit = int.slice(-1)
      if (unit === 'h') {
        return val * 60
      }
      if (unit === 'd') {
        return val * 60 * 24
      }
      return val
    }
    return getMinutes(a) - getMinutes(b)
  })
}
