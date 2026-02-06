import { describe, expect, it } from 'vitest'
import type { PairAnalysisResult } from '@/types'
import type { HistoricalRecord } from './tracking-types'
import { buildReversionModel } from './reversion-probability'

function makeResult(symbol: string, spreadZScore: number, correlation: number): PairAnalysisResult {
  return {
    pairKey: `ETHUSDT|${symbol}`,
    symbol,
    primarySymbol: 'ETHUSDT',
    timestamp: Date.now(),
    correlation,
    spreadMean: 0,
    spreadStd: 1,
    spreadZScore,
    hedgeRatioBeta: 1,
    stationarity: {
      adfTStat: -3,
      adfCriticalValue: -2.86,
      adfPassed: true,
      cointegrationTStat: -3.1,
      cointegrationCriticalValue: -2.86,
      cointegrationPassed: true,
      halfLifeBars: 15,
      halfLifePassed: true,
      isTradable: true,
    },
    ratio: 1,
    alignedBars: 300,
    opportunityScore: 50,
    reversionProbability: {
      probability: 0.5,
      lookaheadBars: 1,
      sampleSize: 0,
      wins: 0,
      method: 'fallback',
    },
    spreadOpportunity: 50,
    methodAverage: 50,
    volatilitySpread: {
      rawZScore: spreadZScore,
      adjustedZScore: spreadZScore,
      combinedVolatility: 0.02,
      primaryVolatility: 0.02,
      secondaryVolatility: 0.02,
      signalStrength: 50,
      signalQuality: 'strong',
    },
    correlationVelocity: {
      currentCorrelation: correlation,
      previousCorrelation: correlation,
      velocity: 0,
      acceleration: 0,
      regime: 'stable_strong',
    },
    confluence: {
      rating: 0,
      ratingLabel: 'No Confluence',
      indicators: {
        zScoreExtreme: false,
        correlationStrengthening: false,
        signalQualityStrong: false,
      },
      indicatorDetails: [],
      meetsThreshold: false,
      direction: 'neutral',
    },
    notes: [],
  }
}

function makeRecord(timestamp: number, zScore: number): HistoricalRecord {
  return {
    id: `snap-${timestamp}`,
    timestamp,
    date: new Date(timestamp).toISOString(),
    primaryPair: 'ETHUSDT',
    interval: '1m',
    results: [makeResult('ALPHAUSDT', zScore, 0.82)],
    marketContext: {
      totalPairs: 1,
      premiumCount: 0,
      strongCorrCount: 1,
      avgOpportunity: 50,
      marketRegime: 'ranging',
    },
  }
}

describe('buildReversionModel', () => {
  it('estimates reversion probability from labeled historical outcomes', () => {
    const baseTs = 1_700_000_000_000
    const history: HistoricalRecord[] = []

    for (let i = 0; i < 20; i++) {
      if (i % 2 === 0) {
        history.push(makeRecord(baseTs + i * 60_000, 2.2))
      } else {
        const eventIndex = Math.floor(i / 2)
        const winner = eventIndex < 8
        history.push(makeRecord(baseTs + i * 60_000, winner ? 0.25 : 1.2))
      }
    }

    const model = buildReversionModel(history, 'ETHUSDT', '1m', {
      lookaheadBars: 1,
      entryZScore: 1.5,
      exitZScore: 0.6,
      minSampleSize: 3,
    })

    const estimate = model.estimate(makeResult('ALPHAUSDT', 2.1, 0.8))
    expect(estimate).not.toBeNull()
    expect(estimate?.sampleSize).toBe(10)
    expect(estimate?.wins).toBe(8)
    expect(estimate?.probability).toBeCloseTo(0.75, 4)
  })

  it('returns null estimate when no historical labels exist', () => {
    const model = buildReversionModel([], 'ETHUSDT', '1m')
    const estimate = model.estimate(makeResult('UNKNOWNUSDT', 2.1, 0.8))
    expect(estimate).toBeNull()
  })
})
