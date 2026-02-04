import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals)
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatSigned(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}`
}

export function getSignalQualityClass(quality: string): string {
  switch (quality) {
    case 'premium':
      return 'signal-premium'
    case 'strong':
      return 'signal-strong'
    case 'moderate':
      return 'signal-moderate'
    case 'noisy':
      return 'signal-noisy'
    case 'weak':
    default:
      return 'signal-weak'
  }
}

export function getOpportunityClass(score: number): string {
  if (score >= 70) {
    return 'opportunity-high'
  }
  if (score >= 40) {
    return 'opportunity-medium'
  }
  return 'opportunity-low'
}

export function getZScoreClass(zscore: number): string {
  const abs = Math.abs(zscore)
  if (abs >= 2) {
    return 'zscore-extreme'
  }
  if (abs >= 1) {
    return 'zscore-high'
  }
  return 'zscore-normal'
}
