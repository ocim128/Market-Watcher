# Market Watcher - Quick Wins 🚀

These are the highest-impact, lowest-effort improvements you can make right now.

---

## 1. Fix Duplicate Type Definition (2 minutes)

**Problem:** `IntervalType` is defined in both `config/index.ts` and `types/index.ts`

**Fix:**
```typescript
// config/index.ts
export type IntervalType = (typeof AVAILABLE_INTERVALS)[number]["value"]

// types/index.ts
// Remove this duplicate definition:
// export type IntervalType = "1m" | "3m" | "5m" | ...

// Instead, re-export from config:
export type { IntervalType } from '@/config'
```

---

## 2. Add Missing Prettier Config (5 minutes)

**Create `.prettierrc`:**
```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

**Add script to package.json:**
```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\""
  }
}
```

**Run it:**
```bash
npm run format
```

---

## 3. Install Zustand (5 minutes)

```bash
npm install zustand
npm install -D @types/node
```

**Create basic store:**
```typescript
// src/features/scan/store/scan-store.ts
import { create } from 'zustand'
import type { ScanProgress, PairAnalysisResult } from '@/types'

interface ScanState {
  progress: ScanProgress
  analysisResults: PairAnalysisResult[]
  isScanning: boolean
  
  actions: {
    setProgress: (progress: ScanProgress) => void
    setAnalysisResults: (results: PairAnalysisResult[]) => void
    reset: () => void
  }
}

const initialState = {
  progress: { current: 0, total: 0, currentSymbol: '', status: 'idle' },
  analysisResults: [],
  isScanning: false,
}

export const useScanStore = create<ScanState>((set) => ({
  ...initialState,
  
  actions: {
    setProgress: (progress) => set({ progress, isScanning: progress.status === 'scanning' }),
    setAnalysisResults: (analysisResults) => set({ analysisResults }),
    reset: () => set(initialState),
  }
}))

// Usage in components:
// const { progress, actions } = useScanStore()
```

---

## 4. Add ESLint Rule for File Size (5 minutes)

**Update `eslint.config.mjs`:**
```javascript
{
  rules: {
    // ... existing rules
    'max-lines': ['warn', {
      max: 200,
      skipBlankLines: true,
      skipComments: true
    }],
    'max-lines-per-function': ['warn', 50],
  }
}
```

**Run to see warnings:**
```bash
npm run lint
```

---

## 5. Extract Helper Functions from Large Components (15 minutes)

**In `pairs-table.tsx`, extract these functions:**

```typescript
// src/components/dashboard/pairs-table/utils.ts
import type { SignalQuality } from '@/types'

export function getSignalBadgeClass(quality: SignalQuality): string {
  const classes: Record<SignalQuality, string> = {
    premium: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    strong: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
    moderate: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    weak: 'bg-slate-400/10 text-slate-400 border-slate-400/20',
    noisy: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
    insufficient_data: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  }
  return classes[quality] || classes.insufficient_data
}

export function getSignalLabel(quality: SignalQuality): string {
  const labels: Record<SignalQuality, string> = {
    premium: '💎 Premium',
    strong: '💪 Strong',
    moderate: '📊 Moderate',
    weak: '📉 Weak',
    noisy: '🔊 Noisy',
    insufficient_data: '⚠️ No Data',
  }
  return labels[quality] || quality
}

export const signalQualityOrder: Record<SignalQuality, number> = {
  premium: 5,
  strong: 4,
  moderate: 3,
  weak: 2,
  noisy: 1,
  insufficient_data: 0,
}
```

**Then import in `pairs-table.tsx`:**
```typescript
import { getSignalBadgeClass, getSignalLabel, signalQualityOrder } from './utils'
```

---

## 6. Add Path Alias for Features (5 minutes)

**Update `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"]
    }
  }
}
```

**Update `next.config.js`:**
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/features': './src/features',
      '@/shared': './src/shared',
    }
    return config
  },
}

module.exports = nextConfig
```

---

## 7. Create Barrel Exports (10 minutes)

**Create index files for cleaner imports:**

```typescript
// src/components/dashboard/index.ts
export { Header } from './header'
export { OpportunitySummary } from './opportunity-summary'
export { PairsTable } from './pairs-table'
export { PairDetailModal } from './pair-detail-modal'
// ... etc

// Usage in page.tsx:
// import { Header, PairsTable } from '@/components/dashboard'
```

```typescript
// src/lib/analysis/index.ts
export { analyzePair, analyzeAllPairs } from './pair-analysis'
export { calculateCorrelationVelocity } from './correlation-velocity'
export { calculateVolatilityAdjustedSpread } from './volatility-spread'
export { buildNotes } from './notes-builder'
export { runBacktest } from './backtest-engine'
export * from './statistics'
```

---

## 8. Add Type-Safe Environment Variables (5 minutes)

**Create `src/env.ts`:**
```typescript
// src/env.ts
export const env = {
  // Client-side env vars (must be prefixed with NEXT_PUBLIC_)
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'Market Watcher',
  
  // Node env
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Feature flags
  ENABLE_HISTORY: process.env.NEXT_PUBLIC_ENABLE_HISTORY === 'true',
} as const

// Type-safe access
// Usage: env.NEXT_PUBLIC_APP_NAME
```

**Update `.env.example`:**
```bash
NEXT_PUBLIC_APP_NAME=Market Watcher
NEXT_PUBLIC_ENABLE_HISTORY=true
```

---

## 9. Add React DevTools Badge (2 minutes)

**In `src/app/layout.tsx` or providers:**
```typescript
// Shows Zustand devtools in dev mode
if (process.env.NODE_ENV === 'development') {
  // This will help with debugging
  console.log('🚀 Market Watcher - Dev Mode')
  console.log('📊 Features: Scan, Analysis, Backtest, History')
}
```

---

## 10. Document Complex Functions (10 minutes)

**Add JSDoc to the most complex functions:**

```typescript
// src/lib/analysis/pair-analysis.ts

/**
 * Analyzes two price series for pair trading opportunities.
 * 
 * Algorithm overview:
 * 1. Aligns price series to minimum length
 * 2. Calculates log returns for correlation
 * 3. Computes spread and Z-score
 * 4. Calculates volatility-adjusted metrics
 * 5. Combines into composite opportunity score
 * 
 * @param primaryCloses - Close prices of primary pair (e.g., ETHUSDT)
 * @param secondaryCloses - Close prices of secondary pair (e.g., BTCUSDT)
 * @param secondarySymbol - Symbol identifier for secondary pair
 * @param primarySymbol - Symbol identifier for primary pair
 * @param options - Optional analysis configuration
 * @returns Analysis result with scores and metrics
 * 
 * @example
 * ```typescript
 * const result = analyzePair(
 *   ethCloses,    // number[]
 *   btcCloses,    // number[]
 *   'BTCUSDT',
 *   'ETHUSDT'
 * )
 * console.log(result.opportunityScore) // 0-100
 * ```
 */
export function analyzePair(
  primaryCloses: number[],
  secondaryCloses: number[],
  secondarySymbol: string,
  primarySymbol: string = 'primary',
  options: AnalyzeOptions = {}
): PairAnalysisResult {
  // ... implementation
}
```

---

## Quick Wins Checklist

- [ ] Fix duplicate IntervalType
- [ ] Add Prettier config and run formatting
- [ ] Install Zustand and create basic store
- [ ] Add max-lines ESLint rule
- [ ] Extract utils from pairs-table.tsx
- [ ] Add path aliases for features
- [ ] Create barrel exports
- [ ] Add type-safe env vars
- [ ] Add dev mode console logs
- [ ] Document analyzePair function

**Total time: ~60 minutes**  
**Impact: High readability + maintainability boost**

---

## Next Steps After Quick Wins

1. **Migrate scan-context.tsx to Zustand** (1-2 hours)
2. **Split pairs-table.tsx into smaller components** (2-3 hours)
3. **Set up testing infrastructure** (1 hour)
4. **Create feature-based folder structure** (2-3 hours)
