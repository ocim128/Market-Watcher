import { describe, expect, it } from 'vitest'
import { calculateRSI, detectRSICrossover } from './rsi-calculator'

describe('rsi-calculator', () => {
  it('returns RSI values with NaN warmup period', () => {
    const closes = [44, 45, 46, 45, 44, 43, 44, 45, 46, 45, 44, 43, 44, 45, 46, 47, 48]
    const rsi = calculateRSI(closes, 14)

    expect(rsi).toHaveLength(closes.length)
    expect(Number.isNaN(rsi[0])).toBe(true)
    expect(Number.isFinite(rsi[14])).toBe(true)
    expect(rsi[14]).toBeGreaterThanOrEqual(0)
    expect(rsi[14]).toBeLessThanOrEqual(100)
  })

  it('detects crossover below threshold', () => {
    const values = [50, 40, 31, 29, 28, 35]
    const events = detectRSICrossover(values, 30)

    expect(events.some(event => event.crossedBelow && event.index === 3)).toBe(true)
  })
})
