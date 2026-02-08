import { calculateReturns, pearsonCorrelation } from './statistics'

export const ALL_VS_ALL_MIN_CORRELATION = 0.35
export const ALL_VS_ALL_MAX_CANDIDATES = 2500

export interface AllVsAllPriceSeries {
  symbol: string
  closePrices: number[]
}

export interface AllVsAllCandidate<T extends AllVsAllPriceSeries = AllVsAllPriceSeries> {
  first: T
  second: T
  absCorrelation: number
}

export function buildAllVsAllCandidates<T extends AllVsAllPriceSeries>(
  series: T[],
  minCorrelation: number = ALL_VS_ALL_MIN_CORRELATION,
  maxCandidates: number = ALL_VS_ALL_MAX_CANDIDATES
): AllVsAllCandidate<T>[] {
  const returnsMap = new Map<string, number[]>()
  for (const item of series) {
    returnsMap.set(item.symbol, calculateReturns(item.closePrices))
  }

  const candidates: AllVsAllCandidate<T>[] = []
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      const first = series[i]
      const second = series[j]
      const firstReturns = returnsMap.get(first.symbol) ?? []
      const secondReturns = returnsMap.get(second.symbol) ?? []
      const quickCorr = pearsonCorrelation(firstReturns, secondReturns)
      const absCorrelation = Math.abs(quickCorr)

      if (absCorrelation < minCorrelation) {
        continue
      }

      candidates.push({ first, second, absCorrelation })
    }
  }

  return candidates.sort((a, b) => b.absCorrelation - a.absCorrelation).slice(0, maxCandidates)
}
