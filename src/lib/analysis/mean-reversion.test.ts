import { describe, expect, it } from 'vitest'
import { analyzeMeanReversion, estimateHalfLife, runAdfTest } from './mean-reversion'

function buildMeanRevertingSeries(length: number): { primary: number[]; secondary: number[] } {
  const secondary: number[] = []
  const primary: number[] = []
  const beta = 1.2
  let logSecondary = 4
  let spread = 0

  for (let i = 0; i < length; i++) {
    logSecondary += 0.001 * Math.sin(i / 9)
    spread = 0.82 * spread + 0.01 * Math.sin(i / 5)
    secondary.push(Math.exp(logSecondary))
    primary.push(Math.exp(beta * logSecondary + spread))
  }

  return { primary, secondary }
}

function buildRandomWalkSpreadSeries(length: number): { primary: number[]; secondary: number[] } {
  const secondary: number[] = []
  const primary: number[] = []
  const beta = 1.1
  let logSecondary = 4
  let spread = 0

  for (let i = 0; i < length; i++) {
    logSecondary += 0.001 * Math.sin(i / 11)
    spread += 0.008 * Math.sin(i / 3) + 0.003
    secondary.push(Math.exp(logSecondary))
    primary.push(Math.exp(beta * logSecondary + spread))
  }

  return { primary, secondary }
}

describe('mean-reversion analysis', () => {
  it('detects mean-reverting spread and estimates sensible beta/half-life', () => {
    const { primary, secondary } = buildMeanRevertingSeries(300)
    const analysis = analyzeMeanReversion(primary, secondary, {
      rollingBetaWindow: 100,
      rollingBetaMinWindow: 40,
      minHalfLifeBars: 2,
      maxHalfLifeBars: 120,
    })

    expect(analysis.currentBeta).toBeGreaterThan(0.7)
    expect(analysis.currentBeta).toBeLessThan(2.5)
    expect(analysis.spread).toHaveLength(300)
    expect(analysis.halfLifeBars).toBeGreaterThan(0)
    expect(analysis.halfLifeBars).toBeLessThan(120)
    expect(analysis.adf.tStat).toBeLessThan(0)
  })

  it('rejects a non-stationary spread process', () => {
    const { primary, secondary } = buildRandomWalkSpreadSeries(300)
    const analysis = analyzeMeanReversion(primary, secondary, {
      rollingBetaWindow: 100,
      rollingBetaMinWindow: 40,
      minHalfLifeBars: 2,
      maxHalfLifeBars: 80,
    })

    expect(analysis.isMeanReverting).toBe(false)
  })

  it('estimates slower half-life for drifting process than for stationary process', () => {
    const stationary = Array.from({ length: 200 }, (_, i) => Math.sin(i / 7) * 0.5)
    const drifting = Array.from({ length: 200 }, (_, i) => i * 0.02 + Math.sin(i / 7) * 0.1)
    const stationaryHalfLife = estimateHalfLife(stationary)
    const driftingHalfLife = estimateHalfLife(drifting)

    expect(stationaryHalfLife).toBeGreaterThan(0)
    expect(driftingHalfLife).toBeGreaterThan(stationaryHalfLife)
  })

  it('adf test prefers stationary process over drifting process', () => {
    const stationary = Array.from({ length: 200 }, (_, i) => Math.sin(i / 7) * 0.5)
    const drifting = Array.from({ length: 200 }, (_, i) => i * 0.03 + Math.sin(i / 7) * 0.2)

    const stationaryAdf = runAdfTest(stationary)
    const driftingAdf = runAdfTest(drifting)

    expect(stationaryAdf.tStat).toBeLessThan(driftingAdf.tStat)
  })
})
