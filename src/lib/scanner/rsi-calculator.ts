import type { CrossoverEvent } from './types'

export function calculateRSI(closes: number[], period: number = 14): number[] {
  if (!Array.isArray(closes) || closes.length === 0) {
    return []
  }

  const safePeriod = Math.max(2, Math.floor(period))
  const rsi = new Array<number>(closes.length).fill(Number.NaN)

  if (closes.length <= safePeriod) {
    return rsi
  }

  let gainSum = 0
  let lossSum = 0

  for (let i = 1; i <= safePeriod; i++) {
    const change = closes[i] - closes[i - 1]
    if (change >= 0) {
      gainSum += change
    } else {
      lossSum += Math.abs(change)
    }
  }

  let avgGain = gainSum / safePeriod
  let avgLoss = lossSum / safePeriod

  if (avgLoss === 0 && avgGain === 0) {
    rsi[safePeriod] = 50
  } else if (avgLoss === 0) {
    rsi[safePeriod] = 100
  } else {
    const rs = avgGain / avgLoss
    rsi[safePeriod] = 100 - 100 / (1 + rs)
  }

  for (let i = safePeriod + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    avgGain = (avgGain * (safePeriod - 1) + gain) / safePeriod
    avgLoss = (avgLoss * (safePeriod - 1) + loss) / safePeriod

    if (avgLoss === 0 && avgGain === 0) {
      rsi[i] = 50
    } else if (avgLoss === 0) {
      rsi[i] = 100
    } else {
      const rs = avgGain / avgLoss
      rsi[i] = 100 - 100 / (1 + rs)
    }
  }

  return rsi
}

export function detectRSICrossover(rsiValues: number[], threshold: number = 30): CrossoverEvent[] {
  const events: CrossoverEvent[] = []

  for (let i = 1; i < rsiValues.length; i++) {
    const prev = rsiValues[i - 1]
    const current = rsiValues[i]

    if (!Number.isFinite(prev) || !Number.isFinite(current)) {
      continue
    }

    const crossedBelow = prev > threshold && current <= threshold
    const crossedAbove = prev < threshold && current >= threshold

    if (crossedBelow || crossedAbove) {
      events.push({
        index: i,
        from: prev,
        to: current,
        crossedBelow,
        crossedAbove,
      })
    }
  }

  return events
}
