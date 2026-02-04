import { describe, it, expect } from 'vitest'
import {
  cn,
  formatNumber,
  formatPercent,
  formatSigned,
  getSignalQualityClass,
  getOpportunityClass,
  getZScoreClass,
} from './utils'

describe('cn (class name utility)', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const isDisabled = false
    expect(cn('base', isActive && 'conditional')).toBe('base conditional')
    expect(cn('base', isDisabled && 'conditional')).toBe('base')
  })

  it('handles Tailwind class conflicts', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('handles array inputs', () => {
    expect(cn(['class1', 'class2'])).toBe('class1 class2')
  })

  it('handles object inputs', () => {
    expect(cn({ active: true, disabled: false })).toBe('active')
  })

  it('filters out falsy values', () => {
    expect(cn('foo', null, undefined, false, 'bar')).toBe('foo bar')
  })
})

describe('formatNumber', () => {
  it('formats number with default 2 decimals', () => {
    expect(formatNumber(3.14159)).toBe('3.14')
  })

  it('formats number with custom decimals', () => {
    expect(formatNumber(3.14159, 4)).toBe('3.1416')
    expect(formatNumber(3.14159, 0)).toBe('3')
  })

  it('handles negative numbers', () => {
    expect(formatNumber(-123.456)).toBe('-123.46')
  })

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0.00')
  })

  it('rounds correctly', () => {
    expect(formatNumber(2.555, 2)).toBe('2.56')
    expect(formatNumber(2.554, 2)).toBe('2.55')
  })
})

describe('formatPercent', () => {
  it('formats decimal as percentage', () => {
    expect(formatPercent(0.1234)).toBe('12.3%')
  })

  it('formats with default 1 decimal', () => {
    expect(formatPercent(0.5)).toBe('50.0%')
  })

  it('formats with custom decimals', () => {
    expect(formatPercent(0.123456, 2)).toBe('12.35%')
  })

  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0.0%')
  })

  it('handles values greater than 1', () => {
    expect(formatPercent(1.5)).toBe('150.0%')
  })
})

describe('formatSigned', () => {
  it('adds plus sign to positive numbers', () => {
    expect(formatSigned(5)).toBe('+5.00')
  })

  it('keeps minus sign for negative numbers', () => {
    expect(formatSigned(-5)).toBe('-5.00')
  })

  it('shows plus sign for zero', () => {
    expect(formatSigned(0)).toBe('+0.00')
  })

  it('formats with custom decimals', () => {
    expect(formatSigned(3.14159, 3)).toBe('+3.142')
  })
})

describe('getSignalQualityClass', () => {
  it('returns correct class for premium', () => {
    expect(getSignalQualityClass('premium')).toBe('signal-premium')
  })

  it('returns correct class for strong', () => {
    expect(getSignalQualityClass('strong')).toBe('signal-strong')
  })

  it('returns correct class for moderate', () => {
    expect(getSignalQualityClass('moderate')).toBe('signal-moderate')
  })

  it('returns correct class for noisy', () => {
    expect(getSignalQualityClass('noisy')).toBe('signal-noisy')
  })

  it('returns weak class for weak', () => {
    expect(getSignalQualityClass('weak')).toBe('signal-weak')
  })

  it('returns weak class for unknown value', () => {
    expect(getSignalQualityClass('unknown')).toBe('signal-weak')
  })
})

describe('getOpportunityClass', () => {
  it('returns high class for score >= 70', () => {
    expect(getOpportunityClass(70)).toBe('opportunity-high')
    expect(getOpportunityClass(100)).toBe('opportunity-high')
  })

  it('returns medium class for score >= 40', () => {
    expect(getOpportunityClass(40)).toBe('opportunity-medium')
    expect(getOpportunityClass(69)).toBe('opportunity-medium')
  })

  it('returns low class for score < 40', () => {
    expect(getOpportunityClass(39)).toBe('opportunity-low')
    expect(getOpportunityClass(0)).toBe('opportunity-low')
  })

  it('returns low class for negative scores', () => {
    expect(getOpportunityClass(-10)).toBe('opportunity-low')
  })
})

describe('getZScoreClass', () => {
  it('returns extreme class for |zscore| >= 2', () => {
    expect(getZScoreClass(2)).toBe('zscore-extreme')
    expect(getZScoreClass(-2)).toBe('zscore-extreme')
    expect(getZScoreClass(3.5)).toBe('zscore-extreme')
  })

  it('returns high class for |zscore| >= 1', () => {
    expect(getZScoreClass(1)).toBe('zscore-high')
    expect(getZScoreClass(-1.5)).toBe('zscore-high')
    expect(getZScoreClass(1.99)).toBe('zscore-high')
  })

  it('returns normal class for |zscore| < 1', () => {
    expect(getZScoreClass(0)).toBe('zscore-normal')
    expect(getZScoreClass(0.5)).toBe('zscore-normal')
    expect(getZScoreClass(-0.99)).toBe('zscore-normal')
  })
})
