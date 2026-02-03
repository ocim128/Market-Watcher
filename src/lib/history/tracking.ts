/**
 * Historical tracking system for opportunity data
 * Persists scan results and analyzes performance over time
 */

import type { PairAnalysisResult, ConfluenceResult } from "@/types"

const STORAGE_KEY = "market-watcher-history"
const MAX_HISTORY_DAYS = 30
const MAX_SNAPSHOTS_PER_DAY = 144 // Every 10 minutes for 24h

export interface HistoricalRecord {
    id: string
    timestamp: number
    date: string // ISO date string
    primaryPair: string
    interval: string
    results: PairAnalysisResult[]
    confluenceResults?: ConfluenceResult[]
    marketContext: {
        totalPairs: number
        premiumCount: number
        strongCorrCount: number
        avgOpportunity: number
        marketRegime: "trending" | "ranging" | "choppy" | "unknown"
    }
}

export interface PairHistoricalData {
    symbol: string
    primarySymbol: string
    firstSeen: number
    lastSeen: number
    totalOccurrences: number
    avgOpportunityScore: number
    maxOpportunityScore: number
    minOpportunityScore: number
    avgZScore: number
    avgCorrelation: number
    signalQualityDistribution: Record<string, number>
    opportunityTrend: "improving" | "declining" | "stable" | "volatile"
    recentSignals: HistoricalSignal[]
}

export interface HistoricalSignal {
    timestamp: number
    opportunityScore: number
    zScore: number
    correlation: number
    signalQuality: string
    wasExtreme: boolean // |zScore| > 2
}

export interface OpportunityTrend {
    pair: string
    trend: "improving" | "declining" | "stable" | "volatile"
    changePercent: number
    consistency: number // 0-1 how consistent the trend is
}

export interface HistoryStats {
    totalSnapshots: number
    dateRange: { start: number; end: number }
    mostActivePairs: string[]
    bestPerformingPairs: string[]
    signalAccuracy: {
        premium: { total: number; worked: number }
        strong: { total: number; worked: number }
        moderate: { total: number; worked: number }
    }
}

/**
 * Save a snapshot to history
 */
export function saveSnapshot(
    results: PairAnalysisResult[],
    primaryPair: string,
    interval: string,
    confluenceResults?: ConfluenceResult[]
): HistoricalRecord {
    const now = Date.now()
    const record: HistoricalRecord = {
        id: `snap_${now}`,
        timestamp: now,
        date: new Date(now).toISOString(),
        primaryPair,
        interval,
        results,
        confluenceResults,
        marketContext: calculateMarketContext(results),
    }
    
    const history = loadHistory()
    history.push(record)
    
    // Clean old data
    const cutoff = now - MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000
    const filtered = history.filter(h => h.timestamp > cutoff)
    
    // Limit snapshots per day to prevent storage bloat
    const cleaned = limitSnapshotsPerDay(filtered)
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
    
    return record
}

/**
 * Load all historical records
 */
export function loadHistory(): HistoricalRecord[] {
    if (typeof window === "undefined") return []
    
    try {
        const data = localStorage.getItem(STORAGE_KEY)
        return data ? JSON.parse(data) : []
    } catch {
        return []
    }
}

/**
 * Clear all history
 */
export function clearHistory(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(STORAGE_KEY)
}

/**
 * Get history for a specific pair
 */
export function getPairHistory(symbol: string): PairHistoricalData | null {
    const history = loadHistory()
    const pairRecords: HistoricalSignal[] = []
    
    let totalOpportunity = 0
    let maxOpportunity = 0
    let minOpportunity = 100
    let totalZScore = 0
    let totalCorrelation = 0
    const qualityDistribution: Record<string, number> = {}
    let firstSeen = Infinity
    let lastSeen = 0
    let count = 0
    
    for (const record of history) {
        for (const result of record.results) {
            if (result.symbol === symbol) {
                pairRecords.push({
                    timestamp: record.timestamp,
                    opportunityScore: result.opportunityScore,
                    zScore: result.spreadZScore,
                    correlation: result.correlation,
                    signalQuality: result.volatilitySpread.signalQuality,
                    wasExtreme: Math.abs(result.spreadZScore) > 2,
                })
                
                totalOpportunity += result.opportunityScore
                maxOpportunity = Math.max(maxOpportunity, result.opportunityScore)
                minOpportunity = Math.min(minOpportunity, result.opportunityScore)
                totalZScore += Math.abs(result.spreadZScore)
                totalCorrelation += Math.abs(result.correlation)
                
                qualityDistribution[result.volatilitySpread.signalQuality] = 
                    (qualityDistribution[result.volatilitySpread.signalQuality] || 0) + 1
                
                firstSeen = Math.min(firstSeen, record.timestamp)
                lastSeen = Math.max(lastSeen, record.timestamp)
                count++
            }
        }
    }
    
    if (count === 0) return null
    
    // Calculate trend
    const trend = calculateTrend(pairRecords.map(r => r.opportunityScore))
    
    return {
        symbol,
        primarySymbol: history.find(h => h.results.some(r => r.symbol === symbol))?.results.find(r => r.symbol === symbol)?.primarySymbol || "",
        firstSeen,
        lastSeen,
        totalOccurrences: count,
        avgOpportunityScore: Math.round(totalOpportunity / count),
        maxOpportunityScore: maxOpportunity,
        minOpportunityScore: minOpportunity === 100 ? 0 : minOpportunity,
        avgZScore: totalZScore / count,
        avgCorrelation: totalCorrelation / count,
        signalQualityDistribution: qualityDistribution,
        opportunityTrend: trend,
        recentSignals: pairRecords.slice(-20), // Last 20 signals
    }
}

/**
 * Get opportunity trends for all pairs
 */
export function getOpportunityTrends(): OpportunityTrend[] {
    const history = loadHistory()
    const pairScores: Record<string, number[]> = {}
    
    // Group scores by pair
    for (const record of history) {
        for (const result of record.results) {
            if (!pairScores[result.symbol]) {
                pairScores[result.symbol] = []
            }
            pairScores[result.symbol].push(result.opportunityScore)
        }
    }
    
    // Calculate trend for each pair
    return Object.entries(pairScores).map(([pair, scores]) => {
        const trend = calculateTrend(scores)
        const first = scores[0] || 0
        const last = scores[scores.length - 1] || 0
        const changePercent = first > 0 ? ((last - first) / first) * 100 : 0
        
        // Consistency: how often does the score stay in the same direction
        let consistentMoves = 0
        for (let i = 1; i < scores.length; i++) {
            if ((scores[i] >= scores[i-1] && scores[i-1] >= (scores[i-2] || scores[i-1])) ||
                (scores[i] <= scores[i-1] && scores[i-1] <= (scores[i-2] || scores[i-1]))) {
                consistentMoves++
            }
        }
        const consistency = scores.length > 1 ? consistentMoves / (scores.length - 1) : 0
        
        return {
            pair,
            trend,
            changePercent: Math.round(changePercent * 10) / 10,
            consistency: Math.round(consistency * 100) / 100,
        }
    }).sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
}

/**
 * Get best historical opportunities
 */
export function getBestHistoricalOpportunities(
    limit: number = 10,
    minQuality: string = "strong"
): { symbol: string; avgScore: number; occurrences: number; lastSeen: number }[] {
    const history = loadHistory()
    const pairStats: Record<string, { total: number; count: number; lastSeen: number }> = {}
    
    const qualityLevels = ["premium", "strong", "moderate", "weak", "noisy"]
    const minQualityIndex = qualityLevels.indexOf(minQuality)
    
    for (const record of history) {
        for (const result of record.results) {
            const resultQualityIndex = qualityLevels.indexOf(result.volatilitySpread.signalQuality)
            if (resultQualityIndex <= minQualityIndex) {
                if (!pairStats[result.symbol]) {
                    pairStats[result.symbol] = { total: 0, count: 0, lastSeen: 0 }
                }
                pairStats[result.symbol].total += result.opportunityScore
                pairStats[result.symbol].count++
                pairStats[result.symbol].lastSeen = Math.max(pairStats[result.symbol].lastSeen, record.timestamp)
            }
        }
    }
    
    return Object.entries(pairStats)
        .map(([symbol, stats]) => ({
            symbol,
            avgScore: Math.round(stats.total / stats.count),
            occurrences: stats.count,
            lastSeen: stats.lastSeen,
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, limit)
}

/**
 * Get history statistics
 */
export function getHistoryStats(): HistoryStats {
    const history = loadHistory()
    
    if (history.length === 0) {
        return {
            totalSnapshots: 0,
            dateRange: { start: 0, end: 0 },
            mostActivePairs: [],
            bestPerformingPairs: [],
            signalAccuracy: {
                premium: { total: 0, worked: 0 },
                strong: { total: 0, worked: 0 },
                moderate: { total: 0, worked: 0 },
            },
        }
    }
    
    const timestamps = history.map(h => h.timestamp)
    const start = Math.min(...timestamps)
    const end = Math.max(...timestamps)
    
    // Most active pairs
    const pairCounts: Record<string, number> = {}
    for (const record of history) {
        for (const result of record.results) {
            pairCounts[result.symbol] = (pairCounts[result.symbol] || 0) + 1
        }
    }
    const mostActive = Object.entries(pairCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([pair]) => pair)
    
    // Best performing (would need actual trade outcomes - simplified here)
    const bestPerforming = getBestHistoricalOpportunities(10).map(o => o.symbol)
    
    return {
        totalSnapshots: history.length,
        dateRange: { start, end },
        mostActivePairs: mostActive,
        bestPerformingPairs: bestPerforming,
        signalAccuracy: {
            premium: { total: 0, worked: 0 }, // Would need tracking of what "worked"
            strong: { total: 0, worked: 0 },
            moderate: { total: 0, worked: 0 },
        },
    }
}

/**
 * Export history to CSV
 */
export function exportHistoryToCSV(): string {
    const history = loadHistory()
    const rows: string[] = []
    
    // Header
    rows.push("timestamp,date,symbol,primary_pair,opportunity_score,z_score,correlation,signal_quality")
    
    // Data
    for (const record of history) {
        for (const result of record.results) {
            rows.push([
                record.timestamp,
                new Date(record.timestamp).toISOString(),
                result.symbol,
                result.primarySymbol,
                result.opportunityScore,
                result.spreadZScore.toFixed(4),
                result.correlation.toFixed(4),
                result.volatilitySpread.signalQuality,
            ].join(","))
        }
    }
    
    return rows.join("\n")
}

// Helper functions
function calculateMarketContext(results: PairAnalysisResult[]) {
    const premiumCount = results.filter(r => r.volatilitySpread.signalQuality === "premium").length
    const strongCorrCount = results.filter(r => Math.abs(r.correlation) >= 0.7).length
    const avgOpportunity = results.length > 0
        ? results.reduce((sum, r) => sum + r.opportunityScore, 0) / results.length
        : 0
    
    // Simple regime detection
    const extremeZCount = results.filter(r => Math.abs(r.spreadZScore) > 2).length
    let marketRegime: "trending" | "ranging" | "choppy" | "unknown" = "unknown"
    if (results.length > 0) {
        const extremeRatio = extremeZCount / results.length
        if (extremeRatio > 0.3) marketRegime = "trending"
        else if (extremeRatio < 0.1) marketRegime = "ranging"
        else marketRegime = "choppy"
    }
    
    return {
        totalPairs: results.length,
        premiumCount,
        strongCorrCount,
        avgOpportunity: Math.round(avgOpportunity),
        marketRegime,
    }
}

function limitSnapshotsPerDay(history: HistoricalRecord[]): HistoricalRecord[] {
    const byDay: Record<string, HistoricalRecord[]> = {}
    
    for (const record of history) {
        const day = new Date(record.timestamp).toDateString()
        if (!byDay[day]) byDay[day] = []
        byDay[day].push(record)
    }
    
    const result: HistoricalRecord[] = []
    for (const dayRecords of Object.values(byDay)) {
        // Sort by timestamp and take most recent up to limit
        const sorted = dayRecords.sort((a, b) => b.timestamp - a.timestamp)
        result.push(...sorted.slice(0, MAX_SNAPSHOTS_PER_DAY))
    }
    
    return result.sort((a, b) => a.timestamp - b.timestamp)
}

function calculateTrend(values: number[]): "improving" | "declining" | "stable" | "volatile" {
    if (values.length < 3) return "stable"
    
    // Simple linear regression slope
    const n = values.length
    const sumX = (n * (n - 1)) / 2
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0)
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    
    // Calculate volatility (std dev of changes)
    const changes: number[] = []
    for (let i = 1; i < values.length; i++) {
        changes.push(values[i] - values[i-1])
    }
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length
    const variance = changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length
    const volatility = Math.sqrt(variance)
    
    if (volatility > 15) return "volatile"
    if (slope > 2) return "improving"
    if (slope < -2) return "declining"
    return "stable"
}

/**
 * Get summary for dashboard display
 */
export function getHistorySummary(): {
    snapshotsToday: number
    uniquePairsTracked: number
    bestOpportunityToday: { symbol: string; score: number } | null
    marketRegimeTrend: "improving" | "declining" | "stable"
} {
    const history = loadHistory()
    const today = new Date().toDateString()
    
    const todayRecords = history.filter(h => new Date(h.timestamp).toDateString() === today)
    const snapshotsToday = todayRecords.length
    
    const allPairs = new Set<string>()
    let bestOpportunity: { symbol: string; score: number } | null = null
    
    for (const record of todayRecords) {
        for (const result of record.results) {
            allPairs.add(result.symbol)
            if (!bestOpportunity || result.opportunityScore > bestOpportunity.score) {
                bestOpportunity = { symbol: result.symbol, score: result.opportunityScore }
            }
        }
    }
    
    // Market regime trend
    const regimes = history.slice(-10).map(h => h.marketContext.marketRegime)
    const regimeCounts = regimes.reduce((acc, r) => {
        acc[r] = (acc[r] || 0) + 1
        return acc
    }, {} as Record<string, number>)
    
    let marketRegimeTrend: "improving" | "declining" | "stable" = "stable"
    if ((regimeCounts["ranging"] || 0) > regimes.length * 0.6) {
        marketRegimeTrend = "improving" // Ranging is good for pairs trading
    } else if ((regimeCounts["trending"] || 0) > regimes.length * 0.6) {
        marketRegimeTrend = "declining" // Trending is harder
    }
    
    return {
        snapshotsToday,
        uniquePairsTracked: allPairs.size,
        bestOpportunityToday: bestOpportunity,
        marketRegimeTrend,
    }
}
