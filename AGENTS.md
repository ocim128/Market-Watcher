# Market Watcher - AI Agent Guide

A real-time pair trading opportunity dashboard for cryptocurrency markets. Built with Next.js 16, TypeScript, and Tailwind CSS.

## Project Overview

**Purpose**: Analyze correlations, spread divergences, and volatility to identify mean-reversion scalping opportunities on Binance.

**Core Domain**: Statistical arbitrage (pairs trading) - finding temporarily mispriced correlated assets.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.9+ |
| Styling | Tailwind CSS 3.4 |
| UI Components | shadcn/ui |
| Charts | Lightweight Charts v5 |
| State Management | TanStack Query (React Query) v5 |
| Theme | next-themes |
| Animation | framer-motion |

## Project Structure

```
src/
├── app/                          # Next.js app router
│   ├── (dashboard)/             # Route group for dashboard pages
│   │   ├── layout.tsx          # Dashboard layout with navigation sidebar
│   │   ├── page.tsx            # Main dashboard: DashboardHeader, OpportunitySummary, BacktestAllPanel, PairsTable, QuickAccess
│   │   ├── mtf/page.tsx        # Multi-Timeframe Confluence page
│   │   └── history/page.tsx    # Historical Tracking page
│   ├── layout.tsx              # Root layout with Providers, gradient background
│   └── globals.css             # Tailwind + CSS variables + custom utilities
├── components/
│   ├── providers.tsx           # QueryClient + ThemeProvider + ScanProvider
│   ├── scan-context.tsx        # React context for scan state management
│   ├── navigation/             # Navigation components
│   │   ├── main-nav.tsx        # Desktop sidebar + mobile header
│   │   ├── nav-item.tsx        # Navigation item component
│   │   └── index.ts
│   ├── charts/                 # Lightweight Charts wrappers
│   │   ├── spread-chart.tsx
│   │   ├── correlation-chart.tsx
│   │   └── price-comparison-chart.tsx
│   ├── dashboard/              # Dashboard-specific components
│   │   ├── dashboard-header.tsx   # Simplified header with scan controls
│   │   ├── opportunity-summary.tsx
│   │   ├── pairs-table.tsx
│   │   ├── pair-detail-modal.tsx
│   │   ├── filter-controls.tsx
│   │   ├── settings-panel.tsx
│   │   ├── backtest-panel.tsx
│   │   ├── backtest-all-panel.tsx
│   │   └── quick-access.tsx       # Cards linking to MTF/History
│   ├── mtf/                    # Multi-Timeframe components
│   │   ├── mtf-analysis.tsx
│   │   ├── confluence-card.tsx
│   │   ├── settings-panel.tsx
│   │   ├── timeframe-badge.tsx
│   │   └── constants.ts
│   ├── history/                # Historical Tracking components
│   │   ├── history-analysis.tsx
│   │   ├── trend-badge.tsx
│   │   ├── summary-stats.tsx
│   │   ├── opportunity-trends.tsx
│   │   ├── best-opportunities.tsx
│   │   └── page-header.tsx
│   └── ui/                     # shadcn/ui base components
├── hooks/
│   ├── use-binance-data.ts    # TanStack Query hooks for API data
│   ├── use-pair-scan.ts       # Scan orchestration hook
│   ├── use-binance-websocket.ts
│   ├── use-auto-refresh.ts
│   ├── use-notifications.ts
│   └── use-backtest.ts
├── lib/
│   ├── analysis/          # Statistical analysis engine
│   │   ├── statistics.ts      # Core stats: mean, std, pearson, returns, spread
│   │   ├── pair-analysis.ts   # Main analysis function
│   │   ├── correlation-velocity.ts  # Detect correlation regime changes
│   │   ├── volatility-spread.ts     # Volatility-adjusted signals
│   │   ├── notes-builder.ts
│   │   └── backtest-engine.ts
│   ├── binance/
│   │   └── client.ts      # Binance API client (klines, tickers, exchange info)
│   └── utils.ts           # cn() utility for Tailwind class merging
├── config/
│   └── index.ts           # App configuration, intervals, thresholds
└── types/
    ├── index.ts           # Core types: PairAnalysisResult, SignalQuality, etc.
    └── backtest-types.ts  # Backtest-specific types
```

## Navigation

The app uses a sidebar navigation pattern with a route group for dashboard pages:

### Routes
| Route | Description | Component |
|-------|-------------|-----------|
| `/` | Main Dashboard | `DashboardHeader`, `OpportunitySummary`, `QuickAccess`, `PairsTable` |
| `/mtf` | Multi-Timeframe Confluence | `MtfAnalysis` with full-page confluence scanning |
| `/history` | Historical Tracking | `HistoryAnalysis` with trends and stats |

### Navigation Components
- `components/navigation/main-nav.tsx` - Desktop sidebar + mobile drawer
- `components/navigation/nav-item.tsx` - Individual nav item with active state

### Layout Structure
```
(dashboard)/layout.tsx
├── MainNav (sidebar)
└── main content (page specific)
```

## Key Architectural Patterns

### 1. State Management
- **TanStack Query**: Server state (API data) with automatic caching
- **ScanContext**: Global scan state (progress, results, analysis) via React Context
- Component-local state: UI state only

### 2. Data Flow
```
User clicks "Scan" 
  → scan-context.tsx:scan() 
  → Fetch top USDT pairs from Binance
  → Batch fetch klines (concurrency: 5)
  → Cache in TanStack Query
  → Analyze pairs vs primary
  → Update analysisResults state
  → Components re-render
```

### 3. Analysis Engine
The core algorithm in `lib/analysis/pair-analysis.ts`:

```typescript
// 1. Calculate log returns
returns = log(close[i] / close[i-1])

// 2. Pearson correlation of returns
correlation = pearson(returns1, returns2)

// 3. Log spread
spread = log(primary) - log(secondary)

// 4. Z-score of spread
zScore = (currentSpread - mean) / std

// 5. Opportunity score (60% spread, 40% signal quality)
opportunityScore = spreadOpportunity * 0.6 + methodAverage * 0.4
```

### 4. Type System
Key types in `types/index.ts`:

```typescript
interface PairAnalysisResult {
    symbol: string
    primarySymbol: string
    correlation: number           // -1 to 1
    spreadZScore: number          // Current divergence
    opportunityScore: number      // 0-100 composite
    signalQuality: SignalQuality  // premium|strong|moderate|weak|noisy
    correlationVelocity: CorrelationVelocityResult
    volatilitySpread: VolatilityAdjustedSpreadResult
    notes: string[]
}

type SignalQuality = "premium" | "strong" | "moderate" | "weak" | "noisy" | "insufficient_data"
type CorrelationRegime = "stable_strong" | "strengthening" | "weakening" | "breaking_down" | ...
```

## Configuration

### `src/config/index.ts`
- **Intervals**: 1m, 3m, 5m, 15m, 1h, 4h, 1d
- **Primary pairs**: ETHUSDT, BTCUSDT, BNBUSDT, SOLUSDT, etc.
- **Thresholds**:
  - Strong correlation: > 0.7
  - Extreme Z-Score: > ±2.0
  - Premium volatility: < 2%
  - Noisy volatility: > 5%

### Environment
- No API key required (uses public Binance API)
- Rate limit: ~1200 requests/minute (we use 50ms delays)

## Coding Conventions

### Imports
```typescript
// 1. React/Next imports
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

// 2. Absolute imports (@/*)
import { config } from "@/config"
import { analyzePair } from "@/lib/analysis"
import type { PairAnalysisResult } from "@/types"

// 3. Relative imports (same directory only)
import { useScan } from "./scan-context"
```

### File Naming
- Components: `kebab-case.tsx` (e.g., `pairs-table.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-pair-scan.ts`)
- Utils: `kebab-case.ts` (e.g., `statistics.ts`)

### Style Conventions
- Use Tailwind for all styling
- Use `cn()` utility from `lib/utils.ts` for conditional classes
- Custom CSS variables in `globals.css` for theming
- Dark mode via `dark:` modifier (default theme is dark)

### Component Pattern
```typescript
"use client"  // For client components

import { cn } from "@/lib/utils"

interface Props {
    className?: string
    // ...
}

export function ComponentName({ className }: Props) {
    return (
        <div className={cn("base-classes", className)}>
            {/* ... */}
        </div>
    )
}
```

## API Integration

### Binance Client (`lib/binance/client.ts`)
```typescript
// Fetch OHLCV data
fetchKlinesPaged(symbol, interval, totalBars, batchSize, delayMs)

// Get top pairs by volume
getTopUsdtPairs(limit)

// Exchange info
getExchangeInfo()
```

### Key API Endpoints
- `GET /api/v3/klines` - Historical candles
- `GET /api/v3/ticker/24hr` - 24hr stats (for volume ranking)
- `GET /api/v3/exchangeInfo` - Trading pair metadata

## Backtesting

Strategy implemented in `lib/analysis/backtest-engine.ts`:
- Entry: |spread z-score| > 3 AND correlation >= 0.7
- Exit: Take profit +0.5% OR stop loss -0.5%
- Combined P&L: (long leg + short leg) / 2

## Common Tasks

### Adding a New Chart Type
1. Create component in `components/charts/`
2. Import Lightweight Charts
3. Use `useEffect` to create/update chart instance
4. Export from `components/charts/index.ts`

### Adding a New Filter
1. Update `FilterOptions` type in `types/index.ts`
2. Add UI control in `components/dashboard/filter-controls.tsx`
3. Apply filter in consuming component (usually `pairs-table.tsx`)

### Adding a New Analysis Metric
1. Add field to `PairAnalysisResult` type
2. Calculate in `lib/analysis/pair-analysis.ts`
3. Display in `components/dashboard/pairs-table.tsx` or modal
4. Optionally add to scoring algorithm

### Modifying Thresholds
Edit `config.thresholds` in `src/config/index.ts`:
```typescript
thresholds: {
    strongCorrelation: 0.7,
    extremeZScore: 2.0,
    // ...
}
```

## Build & Development

```bash
# Development
npm run dev          # localhost:3000

# Production build
npm run build        # Outputs to .next/

# Linting
npm run lint         # ESLint on src/**/*.{ts,tsx}
```

## Ported from .NET

The statistical analysis was ported from OpenBullet2's pair trading module. Key differences:
- Log returns instead of simple returns
- Real-time browser updates via React
- Interactive charts vs static plots

## New Features

### Multi-Timeframe Confluence Analysis

Located in `lib/analysis/multi-timeframe.ts`, `lib/binance/resample.ts`, and `components/mtf/`. Access via `/mtf` route.

#### Native + Custom Resampled Intervals

Now supports both native Binance intervals AND custom intervals created by resampling 1m data:

**Native Intervals** (fetched directly from Binance):
- 1m, 3m, 5m, 15m, 30m, 1h, 4h, 1d

**Custom Resampled Intervals** (calculated from 1m data):
- 2m, 4m, 6m, 7m, 8m, 9m, 10m ✨

This allows more granular confluence detection - e.g., checking signals at every minute increment from 1m to 15m!

```typescript
// Key metrics
interface ConfluenceResult {
    confluenceScore: number        // 0-100 combined score
    confidence: "high" | "medium" | "low" | "mixed"
    alignedTimeframes: number      // How many timeframes agree
    zScoreAgreement: number        // Z-score consistency (0-1)
    correlationAgreement: number   // Correlation consistency (0-1)
    signalDirection: "long_spread" | "short_spread" | "neutral"
}
```

**How Resampling Works:**
```typescript
// Example: Create 7m candles from 1m data
const { sourceInterval, needsResample } = resolveFetchInterval("7m")
// Returns: { sourceInterval: "1m", needsResample: true }

// Fetch 1m data (7x more bars), then aggregate:
// - Open = first 1m open
// - High = max of all 1m highs
// - Low = min of all 1m lows  
// - Close = last 1m close
// - Volume = sum of all 1m volumes
```

**Presets:**
- **Ultra Scalp**: 1m, 2m, 3m, 4m, 5m (every minute)
- **Scalping**: 1m, 3m, 5m, 7m, 10m, 15m (optimal for scalping)
- **Advanced**: All intervals 1m-15m (comprehensive but slower)

**Usage:**
- Navigate to "Multi-Timeframe" from sidebar menu
- Click "Run MTF Scan" to analyze
- Select preset or custom intervals (custom ones marked with ✨)
- Adjust bar count and pair limit in settings
- Results sorted by confluence score

### Historical Tracking

Located in `lib/history/tracking.ts` and `components/history/`. Access via `/history` route.

Automatically persists scan results to localStorage for trend analysis:

```typescript
// Features
- Saves every completed scan automatically
- Track opportunity trends over time
- View best historical performers
- Export to CSV
- 30-day retention with cleanup
```

**Data tracked per pair:**
- Average/max/min opportunity scores
- Signal quality distribution
- Z-score and correlation history
- Trend direction (improving/declining/stable/volatile)

**Usage:**
- Scans are saved automatically after analysis completes
- Navigate to "History" from sidebar menu
- View trends, stats, and best performers
- Export data to CSV
- Click pair names to see detailed history (future enhancement)

## Dependencies to Know

| Package | Purpose |
|---------|---------|
| lightweight-charts | TradingView-style charts |
| @tanstack/react-query | Server state management |
| framer-motion | Animations |
| lucide-react | Icons |
| class-variance-authority | Component variants |
| tailwind-merge | Class deduplication |
