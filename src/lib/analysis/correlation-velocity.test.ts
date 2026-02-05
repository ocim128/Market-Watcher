import { describe, expect, it } from 'vitest'
import { determineCorrelationRegime } from './correlation-velocity'

describe('determineCorrelationRegime', () => {
  it('treats weakening anti-correlation as weakening, not recovering', () => {
    expect(determineCorrelationRegime(-0.6, 0.03, -0.9)).toBe('weakening')
  })

  it('flags anti-correlation breakdown when strength falls below weak threshold', () => {
    expect(determineCorrelationRegime(-0.2, 0.04, -0.6)).toBe('breaking_down')
  })

  it('treats stronger anti-correlation as strengthening', () => {
    expect(determineCorrelationRegime(-0.85, -0.02, -0.7)).toBe('strengthening')
  })
})
