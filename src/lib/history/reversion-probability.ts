import type { PairAnalysisResult } from '@/types'
import type { HistoricalRecord } from './tracking-types'

interface Counter {
  wins: number
  total: number
}

export interface ReversionModelOptions {
  lookaheadBars?: number
  entryZScore?: number
  exitZScore?: number
  minSampleSize?: number
}

export interface ReversionEstimate {
  probability: number
  lookaheadBars: number
  sampleSize: number
  wins: number
}

const DEFAULT_OPTIONS: Required<ReversionModelOptions> = {
  lookaheadBars: 12,
  entryZScore: 1.5,
  exitZScore: 0.6,
  minSampleSize: 8,
}

function getDirection(zScore: number): 'long' | 'short' {
  return zScore >= 0 ? 'short' : 'long'
}

function getZBucket(zScore: number): 'medium' | 'high' | 'extreme' {
  const absZ = Math.abs(zScore)
  if (absZ >= 3) {
    return 'extreme'
  }
  if (absZ >= 2) {
    return 'high'
  }
  return 'medium'
}

function getCorrelationBucket(correlation: number): 'weak' | 'moderate' | 'strong' {
  const absCorr = Math.abs(correlation)
  if (absCorr >= 0.7) {
    return 'strong'
  }
  if (absCorr >= 0.4) {
    return 'moderate'
  }
  return 'weak'
}

function updateCounter(map: Map<string, Counter>, key: string, win: boolean): void {
  const prev = map.get(key) ?? { wins: 0, total: 0 }
  map.set(key, {
    wins: prev.wins + (win ? 1 : 0),
    total: prev.total + 1,
  })
}

function findPairResult(
  record: HistoricalRecord,
  entry: PairAnalysisResult
): PairAnalysisResult | undefined {
  return record.results.find(
    r => r.symbol === entry.symbol && r.primarySymbol === entry.primarySymbol
  )
}

function isTradable(result: PairAnalysisResult): boolean {
  if (!('stationarity' in result) || !result.stationarity) {
    return true
  }
  return Boolean(result.stationarity.isTradable)
}

function hasSignal(result: PairAnalysisResult, entryZScore: number): boolean {
  return Number.isFinite(result.spreadZScore) && Math.abs(result.spreadZScore) >= entryZScore
}

function isReverted(
  entry: PairAnalysisResult,
  future: PairAnalysisResult,
  exitZScore: number
): boolean {
  const entryDirection = getDirection(entry.spreadZScore)
  const futureDirection = getDirection(future.spreadZScore)
  const crossedMean = entryDirection !== futureDirection
  const normalized = Math.abs(future.spreadZScore) <= exitZScore
  const compressed = Math.abs(future.spreadZScore) <= Math.abs(entry.spreadZScore) * 0.5
  return crossedMean || normalized || compressed
}

function buildKeys(result: PairAnalysisResult): string[] {
  const direction = getDirection(result.spreadZScore)
  const zBucket = getZBucket(result.spreadZScore)
  const corrBucket = getCorrelationBucket(result.correlation)
  const pairId = `${result.primarySymbol}|${result.symbol}`

  return [
    `pair:${pairId}|dir:${direction}|z:${zBucket}|corr:${corrBucket}`,
    `pair:${pairId}|dir:${direction}`,
    `primary:${result.primarySymbol}|symbol:${result.symbol}|dir:${direction}`,
    `dir:${direction}|z:${zBucket}|corr:${corrBucket}`,
    `dir:${direction}`,
    'global',
  ]
}

function toProbability(counter: Counter): number {
  // Laplace smoothing to avoid hard 0%/100% with sparse labels.
  return (counter.wins + 1) / (counter.total + 2)
}

export function buildReversionModel(
  history: HistoricalRecord[],
  primaryPair: string,
  interval: string,
  options: ReversionModelOptions = {}
): { estimate: (result: PairAnalysisResult) => ReversionEstimate | null } {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const counters = new Map<string, Counter>()

  const scopedRecords = history
    .filter(r => r.primaryPair === primaryPair && r.interval === interval)
    .sort((a, b) => a.timestamp - b.timestamp)

  for (let i = 0; i < scopedRecords.length; i++) {
    const record = scopedRecords[i]
    for (const entry of record.results) {
      if (!isTradable(entry) || !hasSignal(entry, opts.entryZScore)) {
        continue
      }

      let seenFutureBars = 0
      let reverted = false

      for (let j = i + 1; j < scopedRecords.length && seenFutureBars < opts.lookaheadBars; j++) {
        const futureRecord = scopedRecords[j]
        const future = findPairResult(futureRecord, entry)
        if (!future) {
          continue
        }

        seenFutureBars++
        if (isReverted(entry, future, opts.exitZScore)) {
          reverted = true
          break
        }
      }

      const labelAvailable = reverted || seenFutureBars >= opts.lookaheadBars
      if (!labelAvailable) {
        continue
      }

      const keys = buildKeys(entry)
      for (const key of keys) {
        updateCounter(counters, key, reverted)
      }
    }
  }

  return {
    estimate(result: PairAnalysisResult): ReversionEstimate | null {
      const keys = buildKeys(result)
      let best: Counter | null = null

      for (const key of keys) {
        const counter = counters.get(key)
        if (!counter) {
          continue
        }
        if (counter.total >= opts.minSampleSize) {
          return {
            probability: toProbability(counter),
            lookaheadBars: opts.lookaheadBars,
            sampleSize: counter.total,
            wins: counter.wins,
          }
        }
        if (!best || counter.total > best.total) {
          best = counter
        }
      }

      if (!best || best.total === 0) {
        return null
      }

      return {
        probability: toProbability(best),
        lookaheadBars: opts.lookaheadBars,
        sampleSize: best.total,
        wins: best.wins,
      }
    },
  }
}
