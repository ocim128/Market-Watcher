// Pair Analysis Types - mirroring your .NET models

export interface PairAnalysisResult {
    // Metadata
    symbol: string
    primarySymbol: string
    timestamp: number

    // Core metrics
    correlation: number
    spreadMean: number
    spreadStd: number
    spreadZScore: number
    ratio: number
    alignedBars: number

    // Opportunity scoring
    opportunityScore: number
    spreadOpportunity: number
    methodAverage: number

    // Volatility-adjusted spread
    volatilitySpread: VolatilityAdjustedSpreadResult

    // Correlation dynamics
    correlationVelocity: CorrelationVelocityResult

    // Notes from analysis
    notes: string[]
}

export interface VolatilityAdjustedSpreadResult {
    rawZScore: number
    adjustedZScore: number
    combinedVolatility: number
    primaryVolatility: number
    secondaryVolatility: number
    signalStrength: number
    signalQuality: SignalQuality
}

export interface CorrelationVelocityResult {
    currentCorrelation: number
    previousCorrelation: number
    velocity: number
    acceleration: number
    regime: CorrelationRegime
}

export type SignalQuality =
    | "premium"
    | "strong"
    | "moderate"
    | "weak"
    | "noisy"
    | "insufficient_data"

export type CorrelationRegime =
    | "stable_strong"
    | "stable_weak"
    | "stable"
    | "strengthening"
    | "recovering"
    | "weakening"
    | "breaking_down"

// Binance API Types

export interface BinanceKline {
    openTime: number
    open: string
    high: string
    low: string
    close: string
    volume: string
    closeTime: number
    quoteAssetVolume: string
    numberOfTrades: number
    takerBuyBaseVolume: string
    takerBuyQuoteVolume: string
}

export interface BinanceSymbolInfo {
    symbol: string
    status: string
    baseAsset: string
    quoteAsset: string
}

export interface BinanceExchangeInfo {
    timezone: string
    serverTime: number
    symbols: BinanceSymbolInfo[]
}

export interface Binance24hrTicker {
    symbol: string
    priceChangePercent: string
    lastPrice: string
    quoteVolume: string
    volume: string
}

// Application State Types

export interface ScanProgress {
    current: number
    total: number
    currentSymbol: string
    status: "idle" | "scanning" | "complete" | "error"
    error?: string
}

export interface FilterOptions {
    minCorrelation: number
    maxCorrelation: number
    minZScore: number
    minOpportunity: number
    signalQualities: SignalQuality[]
    regimes: CorrelationRegime[]
}

export const DEFAULT_FILTER_OPTIONS: FilterOptions = {
    minCorrelation: 0,
    maxCorrelation: 1,
    minZScore: 0,
    minOpportunity: 0,
    signalQualities: ["premium", "strong", "moderate", "weak", "noisy"],
    regimes: ["stable_strong", "stable_weak", "stable", "strengthening", "recovering", "weakening", "breaking_down"],
}

// Configuration

export interface AppConfig {
    primaryPair: string
    interval: string
    totalBars: number
    topPairsLimit: number
    refreshIntervalMs: number
}

export const DEFAULT_CONFIG: AppConfig = {
    primaryPair: "ETHUSDT",
    interval: "1h",
    totalBars: 500, // Start smaller for quick scans, can be increased
    topPairsLimit: 120,
    refreshIntervalMs: 10 * 60 * 1000, // 10 minutes
}
