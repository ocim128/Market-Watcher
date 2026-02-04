# Market Watcher - Project Improvement Plan

## Executive Summary

This document outlines a comprehensive plan to improve the **maintainability**, **readability**, and **developer experience** of the Market Watcher project. The goal is to transform the current functional-but-growing codebase into a well-structured, scalable application.

**Current State:** ~3,700 lines of TypeScript across 49 files  
**Target State:** Modular architecture with clear separation of concerns

---

## 1. Architecture Improvements

### 1.1 Feature-Based Folder Structure

**Current Structure:**
```
src/
├── components/     # All components mixed together
├── hooks/          # All hooks mixed together
├── lib/            # Utilities mixed with business logic
├── types/          # All types together
└── config/         # Configuration
```

**Proposed Structure:**
```
src/
├── app/                    # Next.js app router
├── features/               # Feature-based modules
│   ├── scan/              # Scan feature
│   │   ├── components/    # Scan-related components
│   │   ├── hooks/         # Scan-related hooks
│   │   ├── store/         # Scan state (Zustand)
│   │   ├── types.ts       # Feature-specific types
│   │   └── utils.ts       # Feature-specific utils
│   ├── analysis/          # Analysis feature
│   ├── backtest/          # Backtesting feature
│   ├── history/           # Historical tracking
│   └── dashboard/         # Dashboard UI components
├── shared/                # Shared across features
│   ├── components/ui/     # shadcn/ui components
│   ├── hooks/             # Generic hooks (useDebounce, etc.)
│   ├── lib/               # Utilities (cn, formatters)
│   ├── types/             # Global types
│   └── config/            # Global config
└── providers.tsx          # Root providers
```

**Benefits:**
- Easier to locate code
- Clear feature boundaries
- Better code ownership
- Simpler testing per feature

---

## 2. State Management Improvements

### 2.1 Replace React Context + useState with Zustand

**Current Issues:**
- `scan-context.tsx` is 276 lines with complex state logic
- Context causes unnecessary re-renders
- State is scattered across hooks and context

**Proposed Solution:**
```typescript
// features/scan/store/scan-store.ts
import { create } from 'zustand'

interface ScanState {
  // State
  progress: ScanProgress
  results: ScanResult[]
  analysisResults: PairAnalysisResult[]
  
  // Actions
  startScan: (options: ScanOptions) => Promise<void>
  analyzeResults: () => void
  reset: () => void
}

export const useScanStore = create<ScanState>((set, get) => ({
  // Implementation
}))
```

**Benefits:**
- No provider wrapper needed
- Selective subscriptions (no unnecessary re-renders)
- DevTools support for debugging
- Persist middleware for cache

### 2.2 Normalize State Shape

**Current:** Arrays with nested lookups
**Proposed:** Normalized state with IDs

```typescript
// Before
interface State {
  results: ScanResult[]
  analysisResults: PairAnalysisResult[]
}

// After
interface State {
  pairs: {
    ids: string[]
    entities: Record<string, Pair>
  }
  analyses: {
    ids: string[]
    entities: Record<string, AnalysisResult>
    byPairId: Record<string, string[]> // Index
  }
}
```

---

## 3. Type System Improvements

### 3.1 Consolidate Type Exports

**Current Issue:** `IntervalType` defined in both `config/index.ts` and `types/index.ts`

**Solution:**
```typescript
// types/index.ts - Single source of truth
export type { IntervalType } from '@/config'  // Re-export from config
// OR move all types to types/ and import in config
```

### 3.2 Strict TypeScript Configuration

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### 3.3 Branded Types for Domain Primitives

```typescript
// types/brands.ts
type Symbol = string & { readonly __brand: 'Symbol' }
type Timestamp = number & { readonly __brand: 'Timestamp' }
type Price = number & { readonly __brand: 'Price' }

// Usage
function processPrice(price: Price): void  // Can't pass plain number
```

---

## 4. Component Improvements

### 4.1 Component Size Reduction

**Current Large Components:**
| Component | Lines | Target |
|-----------|-------|--------|
| `multi-timeframe-panel.tsx` | 619 | < 200 |
| `pairs-table.tsx` | 550 | < 200 |
| `backtest-all-panel.tsx` | 467 | < 200 |
| `pair-detail-modal.tsx` | 357 | < 150 |
| `settings-panel.tsx` | 361 | < 150 |

**Strategy: Extract Sub-Components**

```typescript
// Before: One 550-line file
// pairs-table.tsx

// After: Split by responsibility
// pairs-table/
//   ├── index.tsx          # Main component (50 lines)
//   ├── table-header.tsx   # Sortable headers
//   ├── table-row.tsx      # Row rendering
//   ├── table-filters.tsx  # Filter UI
//   ├── use-sorting.ts     # Sorting logic hook
//   ├── use-filters.ts     # Filtering logic hook
//   └── utils.ts           # Table-specific utilities
```

### 4.2 Container/Presentational Pattern

```typescript
// Container: Handles data and logic
export function PairsTableContainer() {
  const { analysisResults } = useScanStore()
  const { sortedData, sortConfig, setSort } = useSorting(analysisResults)
  
  return <PairsTableView data={sortedData} onSort={setSort} />
}

// Presentational: Pure UI
interface PairsTableViewProps {
  data: PairAnalysisResult[]
  onSort: (key: SortKey) => void
}

export function PairsTableView({ data, onSort }: PairsTableViewProps) {
  // Pure rendering logic only
}
```

### 4.3 Compound Components for Complex UI

```typescript
// Before
<Modal isOpen={isOpen} onClose={onClose} title="Details">
  <Content />
</Modal>

// After
<PairDetailModal isOpen={isOpen} onClose={onClose}>
  <PairDetailModal.Header pair={pair} />
  <PairDetailModal.Charts pair={pair} />
  <PairDetailModal.Stats pair={pair} />
  <PairDetailModal.Actions onTrade={handleTrade} />
</PairDetailModal>
```

---

## 5. Hook Improvements

### 5.1 Single Responsibility Hooks

**Current:** `use-pair-scan.ts` does fetching, caching, AND progress tracking (168 lines)

**Proposed:**
```typescript
// hooks/use-scan-progress.ts - Only progress state
export function useScanProgress() { ... }

// hooks/use-pair-data.ts - Only data fetching
export function usePairData(symbol: string) { ... }

// hooks/use-scan-orchestrator.ts - Combines them
export function useScanOrchestrator() {
  const progress = useScanProgress()
  const queryClient = useQueryClient()
  
  // Orchestration logic only
}
```

### 5.2 Custom Hook Testing Pattern

```typescript
// hooks/__tests__/use-scan.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'

function createWrapper() {
  const queryClient = new QueryClient()
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

test('scan completes successfully', async () => {
  const { result } = renderHook(() => useScan(), { wrapper: createWrapper() })
  
  act(() => result.current.startScan())
  
  await waitFor(() => expect(result.current.isComplete).toBe(true))
})
```

---

## 6. Code Quality Improvements

### 6.1 ESLint Configuration Enhancements

```javascript
// eslint.config.mjs additions
{
  rules: {
    // Import organization
    'import/order': ['error', {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
      'newlines-between': 'always',
    }],
    
    // Component rules
    'react/function-component-definition': ['error', {
      namedComponents: 'function-declaration',
    }],
    'react/jsx-sort-props': ['warn', {
      callbacksLast: true,
      shorthandFirst: true,
    }],
    
    // Complexity
    'complexity': ['warn', 10],
    'max-lines-per-function': ['warn', 50],
    
    // TypeScript
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
  }
}
```

### 6.2 Prettier Configuration

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindFunctions": ["cn", "clsx"]
}
```

### 6.3 Import Organization Convention

```typescript
// 1. External libraries (React, Next)
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

// 2. Internal absolute imports (@/*)
import { useScanStore } from '@/features/scan/store'
import { Button } from '@/shared/components/ui/button'

// 3. Relative imports (same feature only)
import { ScanProgress } from './scan-progress'
import type { ScanOptions } from './types'
```

---

## 7. Testing Strategy

### 7.1 Testing Pyramid

```
        /\
       /  \
      / E2E \        (Playwright - 5%)
     /--------\
    /          \
   / Integration \   (React Testing Library - 20%)
  /--------------\
 /                \
/    Unit Tests    \  (Vitest - 75%)
/--------------------\
```

### 7.2 Test File Organization

```
features/
  scan/
    components/
      scan-button.tsx
      scan-button.test.tsx      # Co-located tests
    hooks/
      use-scan.ts
      use-scan.test.ts
    utils/
      calculate-progress.test.ts
```

### 7.3 Testing Utilities

```typescript
// shared/test/setup.ts
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

expect.extend(matchers)
afterEach(cleanup)

// shared/test/factories.ts - Test data factories
export function createMockPair(overrides?: Partial<Pair>): Pair {
  return {
    symbol: 'BTCUSDT',
    correlation: 0.85,
    // ... defaults
    ...overrides,
  }
}
```

---

## 8. Performance Improvements

### 8.1 React Optimizations

```typescript
// Use React.memo for expensive renders
export const PairRow = React.memo(function PairRow({ pair }: PairRowProps) {
  // Component
}, (prev, next) => prev.pair.id === next.pair.id)

// Use useMemo for expensive calculations
const sortedPairs = useMemo(() => {
  return pairs.sort((a, b) => b.opportunityScore - a.opportunityScore)
}, [pairs])

// Use useCallback for stable references
const handleSort = useCallback((key: SortKey) => {
  setSortKey(key)
}, [])
```

### 8.2 Virtualization for Large Lists

```typescript
// For pairs table with 100+ rows
import { Virtualizer } from '@tanstack/react-virtual'

export function VirtualizedPairsTable({ pairs }: { pairs: Pair[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: pairs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Row height
  })
  
  // Render only visible rows
}
```

### 8.3 Data Fetching Optimizations

```typescript
// Preload critical data
function usePreloadPairData() {
  const queryClient = useQueryClient()
  
  return useCallback((symbol: string) => {
    queryClient.prefetchQuery({
      queryKey: ['pair', symbol],
      queryFn: () => fetchPairData(symbol),
      staleTime: 5000,
    })
  }, [queryClient])
}
```

---

## 9. Documentation Improvements

### 9.1 Component Documentation (Storybook)

```typescript
// components/ui/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'

const meta: Meta<typeof Button> = {
  component: Button,
  args: {
    children: 'Button',
  },
}

export default meta

type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    variant: 'default',
  },
}

export const Loading: Story = {
  args: {
    loading: true,
    children: 'Loading...',
  },
}
```

### 9.2 Architecture Decision Records (ADRs)

```markdown
# docs/adr/001-state-management.md

## Status: Accepted

## Context
We need to choose a state management solution for client-side state.

## Decision
Use Zustand for client state, TanStack Query for server state.

## Consequences
- (+) Simple API
- (+) No provider hell
- (-) Another dependency
```

### 9.3 Code Comments Strategy

```typescript
// ❌ Don't: Obvious comments
// Increment counter
counter++

// ✅ Do: Explain WHY, not WHAT
// Reset counter when pair changes to prevent stale data
// See: https://github.com/org/repo/issues/123
counter = 0

// ✅ Do: Document complex algorithms
/**
 * Calculate opportunity score using weighted formula:
 * - 45% spread Z-score (log scale)
 * - 30% volatility signal strength
 * - 25% correlation quality
 * 
 * @see /docs/algorithms/opportunity-scoring.md
 */
function calculateOpportunityScore(...): number
```

---

## 10. Development Workflow Improvements

### 10.1 Git Hooks (Husky + lint-staged)

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{css,scss}": ["prettier --write"]
  }
}
```

### 10.2 Conventional Commits

```
feat(scan): add progress indicator
fix(analysis): correct z-score calculation
docs(readme): update setup instructions
refactor(hooks): extract useScanProgress
```

### 10.3 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit
      - run: npm run build
```

---

## 11. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Install Zustand, Vitest, Testing Library
- [ ] Update ESLint/Prettier configs
- [ ] Set up Husky pre-commit hooks
- [ ] Create new folder structure (parallel to existing)

### Phase 2: State Migration (Week 2)
- [ ] Create Zustand scan store
- [ ] Migrate scan-context.tsx logic
- [ ] Update components to use new store
- [ ] Test thoroughly

### Phase 3: Component Refactoring (Week 3-4)
- [ ] Refactor pairs-table.tsx (highest priority)
- [ ] Refactor multi-timeframe-panel.tsx
- [ ] Refactor backtest panels
- [ ] Extract shared table components

### Phase 4: Testing (Week 5)
- [ ] Write unit tests for utilities
- [ ] Write tests for hooks
- [ ] Write component tests
- [ ] Set up CI pipeline

### Phase 5: Documentation (Week 6)
- [ ] Set up Storybook
- [ ] Write ADRs
- [ ] Update README
- [ ] Document API clients

---

## 12. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Average component lines | 350 | < 150 |
| Test coverage | 0% | > 70% |
| ESLint errors | ~20 | 0 |
| TypeScript strict errors | ~50 | 0 |
| Bundle size | Unknown | Baseline + < 10% |
| Build time | Unknown | < 30s |

---

## Quick Wins (Do These First!)

1. **Add Prettier config** - Immediate code consistency
2. **Install Zustand** - Start migrating state
3. **Split pairs-table.tsx** - Biggest impact on readability
4. **Fix duplicate IntervalType** - Quick type cleanup
5. **Add component file size ESLint rule** - Prevent future bloat

---

*Document Version: 1.0*  
*Last Updated: 2026-02-04*  
*Author: AI Assistant*
