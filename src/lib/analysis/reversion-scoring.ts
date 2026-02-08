import type { ScanMode } from '@/config'
import type { PairAnalysisResult } from '@/types'
import { buildReversionModel, type ReversionEstimate } from '@/lib/history/reversion-probability'
import { loadHistory, type HistoricalRecord } from '@/lib/history/tracking'

export const ALL_PAIRS_PRIMARY = 'ALL_PAIRS'

interface ProbabilityScoringOptions {
  interval: string
  scanMode: ScanMode
  primaryPair: string
  history?: HistoricalRecord[]
}

export interface ReversionScorer {
  score: (result: PairAnalysisResult) => PairAnalysisResult
}

function getModelPrimary(scanMode: ScanMode, primaryPair: string): string {
  return scanMode === 'all_vs_all' ? ALL_PAIRS_PRIMARY : primaryPair
}

function buildProbabilityNote(estimate: ReversionEstimate, method: 'history' | 'fallback'): string {
  const probabilityLabel = `${Math.round(estimate.probability * 100)}% reversion in ${estimate.lookaheadBars} bars`
  if (method === 'history') {
    return `Historical edge: ${probabilityLabel} (${estimate.wins}/${estimate.sampleSize} labeled samples).`
  }
  return `Estimated edge (fallback): ${probabilityLabel}.`
}

export function createReversionScorer(options: ProbabilityScoringOptions): ReversionScorer {
  const history = options.history ?? loadHistory()
  const modelPrimary = getModelPrimary(options.scanMode, options.primaryPair)
  const model = buildReversionModel(history, modelPrimary, options.interval)

  return {
    score(result: PairAnalysisResult): PairAnalysisResult {
      const estimate = model.estimate(result)
      const tradable = result.stationarity.isTradable
      const probability = estimate?.probability ?? result.reversionProbability.probability
      const lookaheadBars = estimate?.lookaheadBars ?? result.reversionProbability.lookaheadBars
      const sampleSize = estimate?.sampleSize ?? result.reversionProbability.sampleSize
      const wins = estimate?.wins ?? result.reversionProbability.wins
      const method: 'history' | 'fallback' = estimate
        ? 'history'
        : result.reversionProbability.method

      const rescoredProbability = {
        probability,
        lookaheadBars,
        sampleSize,
        wins,
      }

      return {
        ...result,
        opportunityScore: tradable ? Math.round(probability * 100) : 0,
        reversionProbability: {
          ...rescoredProbability,
          method,
        },
        notes: [...result.notes, buildProbabilityNote(rescoredProbability, method)],
      }
    },
  }
}

export function applyProbabilityScoring(
  analyzed: PairAnalysisResult[],
  options: ProbabilityScoringOptions
): PairAnalysisResult[] {
  if (analyzed.length === 0) {
    return []
  }

  const scorer = createReversionScorer(options)
  return analyzed.map(scorer.score).sort((a, b) => b.opportunityScore - a.opportunityScore)
}
