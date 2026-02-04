# Code Examples: Before vs After

Real code examples showing the improvements in action.

---

## 1. State Management

### Before: React Context (276 lines)

```typescript
// src/components/scan-context.tsx
"use client"

import React, { createContext, useContext, useState, useCallback, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { config } from "@/config"
import { getTopUsdtPairs, fetchKlinesPaged, extractClosePrices } from "@/lib/binance"
import { analyzePair } from "@/lib/analysis"
import { queryKeys } from "@/hooks/use-binance-data"
import { saveSnapshot } from "@/lib/history/tracking"
import type { ScanProgress, BinanceKline, PairAnalysisResult } from "@/types"

export interface ScanResult {
    symbol: string
    klines: BinanceKline[]
    closePrices: number[]
}

interface ScanContextValue {
    progress: ScanProgress
    results: ScanResult[]
    analysisResults: PairAnalysisResult[]
    currentPrimaryPair: string
    setCurrentPrimaryPair: (pair: string) => void
    isScanning: boolean
    isAnalyzing: boolean
    isComplete: boolean
    isError: boolean
    scan: (options?: ScanOptions) => Promise<ScanResult[]>
    analyze: () => void
    reset: () => void
    lastScanTime: Date | null
}

// ... 200+ more lines of provider implementation

export function useScan() {
    const context = useContext(ScanContext)
    if (!context) {
        throw new Error("useScan must be used within a ScanProvider")
    }
    return context
}
```

**Issues:**
- Provider wrapper required
- Causes unnecessary re-renders
- Complex memoization needed
- Hard to test

---

### After: Zustand (80 lines)

```typescript
// src/features/scan/store/scan-store.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ScanProgress, PairAnalysisResult } from '@/types'

interface ScanState {
  // State
  progress: ScanProgress
  results: ScanResult[]
  analysisResults: PairAnalysisResult[]
  isScanning: boolean
  isAnalyzing: boolean
  lastScanTime: Date | null
  
  // Actions
  setProgress: (progress: ScanProgress) => void
  setResults: (results: ScanResult[]) => void
  setAnalysisResults: (results: PairAnalysisResult[]) => void
  startScanning: () => void
  completeScan: () => void
  reset: () => void
}

const initialState = {
  progress: { current: 0, total: 0, currentSymbol: '', status: 'idle' },
  results: [],
  analysisResults: [],
  isScanning: false,
  isAnalyzing: false,
  lastScanTime: null,
}

export const useScanStore = create<ScanState>()(
  devtools(
    (set) => ({
      ...initialState,
      
      setProgress: (progress) => set({ 
        progress, 
        isScanning: progress.status === 'scanning' 
      }),
      
      setResults: (results) => set({ results }),
      
      setAnalysisResults: (analysisResults) => set({ 
        analysisResults,
        isAnalyzing: false 
      }),
      
      startScanning: () => set({ 
        isScanning: true,
        isAnalyzing: false 
      }),
      
      completeScan: () => set({ 
        isScanning: false,
        lastScanTime: new Date()
      }),
      
      reset: () => set(initialState),
    }),
    { name: 'ScanStore' }
  )
)

// Usage - No provider needed!
// const { analysisResults, setAnalysisResults } = useScanStore()
```

**Benefits:**
- No provider wrapper
- Selective subscriptions
- DevTools support
- Simple testing

---

## 2. Component Structure

### Before: Monolithic Component (550 lines)

```typescript
// src/components/dashboard/pairs-table.tsx
"use client"

import { ArrowUpDown, ExternalLink, Loader2, BarChart, Info, TrendingUp } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useScan } from "@/components/scan-context"
import { FilterControls } from "./filter-controls"
import { PairDetailModal } from "./pair-detail-modal"
import { Sparkline } from "@/components/ui/sparkline"
import { calculateSpread } from "@/lib/analysis/statistics"
import { config } from "@/config"
import { DEFAULT_FILTER_OPTIONS } from "@/types"
import type { PairAnalysisResult, SignalQuality, FilterOptions } from "@/types"
import { motion, AnimatePresence } from "framer-motion"

type SortKey = "symbol" | "correlation" | "spreadZScore" | "opportunityScore" | "signalQuality"
type SortOrder = "asc" | "desc"

// Inline helper functions (40 lines)
function getSignalBadgeClass(quality: SignalQuality) { /* ... */ }
function getSignalLabel(quality: SignalQuality) { /* ... */ }
function getRegimeLabel(regime: string) { /* ... */ }
const signalQualityOrder: Record<SignalQuality, number> = { /* ... */ }

export function PairsTable() {
    const { analysisResults, results, isScanning, isAnalyzing, isComplete, progress, lastScanTime, currentPrimaryPair } = useScan()
    const [sortKey, setSortKey] = useState<SortKey>("opportunityScore")
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
    const [selectedPair, setSelectedPair] = useState<PairAnalysisResult | null>(null)
    const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTER_OPTIONS)
    const [searchQuery, setSearchQuery] = useState("")

    // Complex filtering logic (80 lines)
    const filteredResults = useMemo(() => {
        return analysisResults.filter((result) => {
            // 10+ filter conditions...
        })
    }, [analysisResults, filters, searchQuery])

    // Complex sorting logic (50 lines)
    const sortedResults = useMemo(() => {
        return [...filteredResults].sort((a, b) => {
            // Sort implementation...
        })
    }, [filteredResults, sortKey, sortOrder])

    // Spread calculation (30 lines)
    const getPairSpread = useMemo(() => {
        // Complex memoization...
    }, [results])

    // Render (350+ lines of JSX)
    return (
        <Card>
            <CardHeader>
                {/* Header content */}
            </CardHeader>
            <CardContent>
                <FilterControls 
                    filters={filters} 
                    onFiltersChange={setFilters}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />
                <Table>
                    {/* Complex table rendering */}
                </Table>
                {selectedPair && (
                    <PairDetailModal 
                        pair={selectedPair} 
                        onClose={() => setSelectedPair(null)}
                    />
                )}
            </CardContent>
        </Card>
    )
}
```

**Issues:**
- 550 lines in one file
- Mixed concerns (filtering, sorting, rendering)
- Hard to test
- Hard to read

---

### After: Split Components (50 + 40 + 60 + 30 = 180 lines)

```typescript
// src/features/dashboard/components/pairs-table/index.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { useScanStore } from "@/features/scan/store/scan-store"
import { useTableFilters } from "./use-table-filters"
import { useTableSorting } from "./use-table-sorting"
import { PairsTableToolbar } from "./pairs-table-toolbar"
import { PairsTableView } from "./pairs-table-view"
import { PairDetailModal } from "../pair-detail-modal"
import type { PairAnalysisResult } from "@/types"
import { useState } from "react"

export function PairsTable() {
  const analysisResults = useScanStore((state) => state.analysisResults)
  const isAnalyzing = useScanStore((state) => state.isAnalyzing)
  
  const [selectedPair, setSelectedPair] = useState<PairAnalysisResult | null>(null)
  
  const { filters, setFilters, filteredData } = useTableFilters(analysisResults)
  const { sortConfig, sortedData, setSort } = useTableSorting(filteredData)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading Opportunities</CardTitle>
      </CardHeader>
      <CardContent>
        <PairsTableToolbar 
          filters={filters}
          onFiltersChange={setFilters}
          isLoading={isAnalyzing}
        />
        <PairsTableView 
          data={sortedData}
          sortConfig={sortConfig}
          onSort={setSort}
          onSelectPair={setSelectedPair}
        />
        <PairDetailModal 
          pair={selectedPair}
          onClose={() => setSelectedPair(null)}
        />
      </CardContent>
    </Card>
  )
}
```

```typescript
// src/features/dashboard/components/pairs-table/use-table-filters.ts
import { useState, useMemo } from "react"
import type { PairAnalysisResult, FilterOptions } from "@/types"

const DEFAULT_FILTERS: FilterOptions = {
  minCorrelation: 0,
  maxCorrelation: 1,
  minZScore: 0,
  minOpportunity: 0,
  signalQualities: ["premium", "strong", "moderate", "weak", "noisy"],
  regimes: ["stable_strong", "stable_weak", "stable", "strengthening", "recovering", "weakening", "breaking_down"],
}

export function useTableFilters(data: PairAnalysisResult[]) {
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (searchQuery && !item.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      if (item.correlation < filters.minCorrelation || item.correlation > filters.maxCorrelation) {
        return false
      }
      if (Math.abs(item.spreadZScore) < filters.minZScore) {
        return false
      }
      if (item.opportunityScore < filters.minOpportunity) {
        return false
      }
      if (!filters.signalQualities.includes(item.volatilitySpread.signalQuality)) {
        return false
      }
      return true
    })
  }, [data, filters, searchQuery])

  return {
    filters,
    setFilters,
    searchQuery,
    setSearchQuery,
    filteredData,
  }
}
```

```typescript
// src/features/dashboard/components/pairs-table/use-table-sorting.ts
import { useState, useMemo } from "react"
import type { PairAnalysisResult, SignalQuality } from "@/types"

type SortKey = "symbol" | "correlation" | "spreadZScore" | "opportunityScore" | "signalQuality"
type SortOrder = "asc" | "desc"

interface SortConfig {
  key: SortKey
  order: SortOrder
}

const SIGNAL_QUALITY_ORDER: Record<SignalQuality, number> = {
  premium: 5,
  strong: 4,
  moderate: 3,
  weak: 2,
  noisy: 1,
  insufficient_data: 0,
}

export function useTableSorting(data: PairAnalysisResult[]) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "opportunityScore",
    order: "desc",
  })

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let comparison = 0
      
      switch (sortConfig.key) {
        case "symbol":
          comparison = a.symbol.localeCompare(b.symbol)
          break
        case "correlation":
          comparison = a.correlation - b.correlation
          break
        case "spreadZScore":
          comparison = Math.abs(a.spreadZScore) - Math.abs(b.spreadZScore)
          break
        case "opportunityScore":
          comparison = a.opportunityScore - b.opportunityScore
          break
        case "signalQuality":
          comparison = SIGNAL_QUALITY_ORDER[a.volatilitySpread.signalQuality] - 
                       SIGNAL_QUALITY_ORDER[b.volatilitySpread.signalQuality]
          break
      }
      
      return sortConfig.order === "asc" ? comparison : -comparison
    })
  }, [data, sortConfig])

  const setSort = (key: SortKey) => {
    setSortConfig(current => ({
      key,
      order: current.key === key && current.order === "desc" ? "asc" : "desc",
    }))
  }

  return { sortConfig, sortedData, setSort }
}
```

```typescript
// src/features/dashboard/components/pairs-table/pairs-table-view.tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table"
import type { PairAnalysisResult } from "@/types"
import { PairRow } from "./pair-row"
import type { SortConfig } from "./use-table-sorting"

interface PairsTableViewProps {
  data: PairAnalysisResult[]
  sortConfig: SortConfig
  onSort: (key: SortConfig["key"]) => void
  onSelectPair: (pair: PairAnalysisResult) => void
}

export function PairsTableView({ data, sortConfig, onSort, onSelectPair }: PairsTableViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead onClick={() => onSort("symbol")}>Pair</TableHead>
          <TableHead onClick={() => onSort("correlation")}>Correlation</TableHead>
          <TableHead onClick={() => onSort("spreadZScore")}>Z-Score</TableHead>
          <TableHead onClick={() => onSort("opportunityScore")}>Score</TableHead>
          <TableHead onClick={() => onSort("signalQuality")}>Quality</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((pair) => (
          <PairRow 
            key={pair.symbol} 
            pair={pair} 
            onClick={() => onSelectPair(pair)}
          />
        ))}
      </TableBody>
    </Table>
  )
}
```

**Benefits:**
- Each file < 100 lines
- Clear separation of concerns
- Easy to test each hook independently
- Reusable logic

---

## 3. Type Safety

### Before: Implicit Types

```typescript
// utils.ts
export function formatNumber(value, decimals = 2) {
    return value.toFixed(decimals)
}

export function getSignalQualityClass(quality) {
    switch (quality) {
        case "premium": return "signal-premium"
        case "strong": return "signal-strong"
        // ...
    }
}

// Usage
const score = formatNumber(data.score)  // What if data.score is undefined?
const className = getSignalQualityClass(data.quality)  // What if quality is invalid?
```

---

### After: Strict Types

```typescript
// types/brands.ts
export type Symbol = string & { readonly __brand: 'Symbol' }
export type Timestamp = number & { readonly __brand: 'Timestamp' }
export type Percentage = number & { readonly __brand: 'Percentage' }

export const Symbol = (value: string): Symbol => value as Symbol
export const Timestamp = (value: number): Timestamp => value as Timestamp
export const Percentage = (value: number): Percentage => value as Percentage
```

```typescript
// shared/lib/formatters.ts
import type { SignalQuality } from '@/types'

export function formatNumber(value: number | undefined, decimals = 2): string {
  if (value === undefined || Number.isNaN(value)) {
    return '--'
  }
  return value.toFixed(decimals)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function getSignalQualityClass(quality: SignalQuality): string {
  const classes: Record<SignalQuality, string> = {
    premium: 'signal-premium',
    strong: 'signal-strong',
    moderate: 'signal-moderate',
    weak: 'signal-weak',
    noisy: 'signal-noisy',
    insufficient_data: 'signal-insufficient',
  }
  
  return classes[quality] ?? 'signal-unknown'
}
```

**Benefits:**
- Compile-time error catching
- Better IDE autocomplete
- Self-documenting code

---

## 4. API Client

### Before: Inline Fetching

```typescript
// hooks/use-binance-data.ts
export function useKlines(symbol: string, interval: string) {
    return useQuery({
        queryKey: ['klines', symbol, interval],
        queryFn: async () => {
            const response = await fetch(
                `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`
            )
            if (!response.ok) {
                throw new Error('Failed to fetch')
            }
            const data = await response.json()
            return data.map((item: any[]) => ({
                openTime: item[0],
                open: item[1],
                // ...
            }))
        }
    })
}
```

---

### After: Structured Client

```typescript
// shared/lib/api/client.ts
const BASE_URL = 'https://api.binance.com'

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message)
  }
}

async function fetchApi<T>(
  endpoint: string,
  params?: Record<string, string | number>
): Promise<T> {
  const url = new URL(endpoint, BASE_URL)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value))
    })
  }

  const response = await fetch(url)
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      error.code || 'UNKNOWN',
      error.msg || `HTTP ${response.status}`
    )
  }

  return response.json()
}

// shared/lib/api/binance-api.ts
import type { BinanceKline, Binance24hrTicker } from '@/types'

export const binanceApi = {
  klines: {
    fetch: (symbol: string, interval: string, limit = 1000): Promise<BinanceKline[]> =>
      fetchApi('/api/v3/klines', { symbol, interval, limit })
        .then(data => data.map(parseKline)),
    
    fetchPaged: async (symbol: string, interval: string, totalBars: number): Promise<BinanceKline[]> => {
      // Implementation with pagination logic
    }
  },
  
  tickers: {
    fetch24hr: (): Promise<Binance24hrTicker[]> =>
      fetchApi('/api/v3/ticker/24hr'),
    
    fetchTopVolume: async (limit: number): Promise<string[]> => {
      const tickers = await binanceApi.tickers.fetch24hr()
      return tickers
        .filter(t => t.symbol.endsWith('USDT'))
        .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
        .slice(0, limit)
        .map(t => t.symbol)
    }
  }
}

// Usage in hooks
export function useKlines(symbol: string, interval: string) {
  return useQuery({
    queryKey: queryKeys.klines(symbol, interval),
    queryFn: () => binanceApi.klines.fetch(symbol, interval),
    staleTime: 60000,
  })
}
```

**Benefits:**
- Centralized error handling
- Type-safe API calls
- Easy to mock for testing
- Consistent request/response handling
