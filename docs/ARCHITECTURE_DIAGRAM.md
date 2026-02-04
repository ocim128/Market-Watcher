# Market Watcher - Architecture Diagram

## Current Architecture (Simplified)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Next.js App                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌──────────────────────────────────────────┐   │
│  │   Layout    │────│              Providers                   │   │
│  └─────────────┘    │  (QueryClient + Theme + ScanContext)     │   │
│                     └──────────────────┬───────────────────────┘   │
│                                        │                           │
│                     ┌──────────────────┴───────────────────────┐   │
│                     │              Page.tsx                    │   │
│                     │  ┌─────────┬─────────┬─────────┬──────┐  │   │
│                     │  │ Header  │ Summary │ Pairs   │ Etc. │  │   │
│                     │  └─────────┴─────────┴─────────┴──────┘  │   │
│                     └──────────────────────────────────────────┘   │
│                                        │                           │
│  ┌─────────────────────────────────────┼────────────────────────┐ │
│  │         Components (Mixed)          │                        │ │
│  │  ┌──────────────┬───────────────────┼──────────────────────┐ │ │
│  │  │ Dashboard    │   Charts          │      UI              │ │ │
│  │  │ - pairs-table│   - spread-chart  │   - button           │ │ │
│  │  │ - header     │   - correlation   │   - card             │ │ │
│  │  │ - filters    │   - price-compare │   - table            │ │ │
│  │  └──────────────┴───────────────────┴──────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                        │                           │
│  ┌─────────────────────────────────────┴────────────────────────┐ │
│  │                      Hooks (Mixed)                            │ │
│  │  - use-pair-scan    - use-binance-data    - use-backtest    │ │
│  │  - use-multi-timeframe    - use-history    - use-scan       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                        │                           │
│  ┌─────────────────────────────────────┴────────────────────────┐ │
│  │                   Lib (Mixed)                                 │ │
│  │  ┌──────────────┬─────────────────┬───────────────────────┐  │ │
│  │  │  Analysis    │    Binance      │       History         │  │ │
│  │  │  - statistics│    - client     │       - tracking      │  │ │
│  │  │  - pair-     │    - resample   │                       │  │ │
│  │  │    analysis  │                 │                       │  │ │
│  │  └──────────────┴─────────────────┴───────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                        │                           │
│                              ┌─────────┴────────┐                  │
│                              │   Binance API    │                  │
│                              └──────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Proposed Architecture (Feature-Based)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Next.js App                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌──────────────────────────────────────────────────┐   │
│  │   Layout    │────│                    Providers                     │   │
│  └─────────────┘    │  (QueryClient + Theme + ZustandProviders)        │   │
│                     └──────────────────┬───────────────────────────────┘   │
│                                        │                                    │
│                     ┌──────────────────┴───────────────────────────────┐   │
│                     │                   Page.tsx                       │   │
│                     │           (Composition Root)                     │   │
│                     └──────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         FEATURE MODULES                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FEATURE: Scan                                                       │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │   │
│  │  │  Components  │ │    Store     │ │    Hooks     │ │   Types     │ │   │
│  │  │  ├ ScanButton│ │  ├ scanStore │ │  ├ useScan   │ │  ├ scan     │ │   │
│  │  │  ├ Progress  │ │  ├ selectors │ │  ├ useProgress│ │  ├ progress │ │   │
│  │  │  └ Status    │ │  └ actions   │ │  └ useResults│ │  └ result   │ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FEATURE: Analysis                                                 │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │   │
│  │  │  Components  │ │    Engine    │ │    Hooks     │ │   Utils     │ │   │
│  │  │  ├ Results   │ │  ├ pair      │ │  ├ useAnalysis│ │  ├ stats   │ │   │
│  │  │  ├ ScoreCard │ │  ├ volatility│ │  ├ useCorrelation│ │  ├ spread │ │   │
│  │  │  └ Charts    │ │  └ backtest  │ │  └ useSignals  │ │  └ velocity│ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FEATURE: Dashboard UI                                             │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                │   │
│  │  │   Layout     │ │   Filters    │ │   Tables     │                │   │
│  │  │  ├ Header    │ │  ├ Controls  │ │  ├ DataTable │                │   │
│  │  │  ├ Grid      │ │  ├ Search    │ │  ├ Sortable  │                │   │
│  │  │  └ Panels    │ │  └ Presets   │ │  └ Paginated │                │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  FEATURE: Backtest                 FEATURE: History                 │   │
│  │  ┌──────────────┐                 ┌──────────────┐                  │   │
│  │  │  Components  │                 │  Components  │                  │   │
│  │  │  ├ Config    │                 │  ├ Timeline  │                  │   │
│  │  │  ├ Results   │                 │  ├ Snapshot  │                  │   │
│  │  │  └ Chart     │                 │  └ Export    │                  │   │
│  │  └──────────────┘                 └──────────────┘                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           SHARED MODULE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  UI Components (shadcn)                                             │   │
│  │  ┌──────────┬──────────┬──────────┬──────────┬──────────────────┐  │   │
│  │  │  Button  │   Card   │  Input   │  Dialog  │      Table       │  │   │
│  │  │  Badge   │  Select  │  Tabs    │  Sheet   │      Chart       │  │   │
│  │  └──────────┴──────────┴──────────┴──────────┴──────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Shared Infrastructure                                              │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │   │
│  │  │   Config     │ │    Utils     │ │    Types     │ │   Lib      │ │   │
│  │  │  ├ intervals│ │  ├ cn        │ │  ├ global   │ │  ├ api     │ │   │
│  │  │  ├ thresholds│ │  ├ formatters│ │  ├ api      │ │  ├ query   │ │   │
│  │  │  └ pairs     │ │  └ constants │ │  └ brands    │ │  └ websocket│ │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  External APIs                                                      │   │
│  │  ┌──────────────────┐              ┌──────────────────┐             │   │
│  │  │   Binance REST   │              │  Binance WebSocket│             │   │
│  │  │   /api/v3/klines │              │  /ws/stream       │             │   │
│  │  └──────────────────┘              └──────────────────┘             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow (Proposed)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   User      │────▶│   UI        │────▶│  Zustand Store  │────▶│  API Client │
│  Action     │     │  Component  │     │                 │     │             │
└─────────────┘     └─────────────┘     └─────────────────┘     └─────────────┘
                                              │                          │
                                              ▼                          ▼
                                       ┌─────────────┐           ┌─────────────┐
                                       │  TanStack   │◀──────────│  Binance    │
                                       │   Query     │   Cache   │   API       │
                                       │   Cache     │           │             │
                                       └─────────────┘           └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │  Analysis   │
                                       │   Engine    │
                                       └─────────────┘
                                              │
                                              ▼
                                       ┌─────────────┐
                                       │   UI        │
                                       │  Updates    │
                                       └─────────────┘
```

## Component Hierarchy

```
Page (Home)
├── Header
│   ├── Logo
│   ├── Navigation
│   └── SettingsTrigger
│
├── OpportunitySummary
│   ├── StatsCards
│   └── TrendIndicator
│
├── BacktestAllPanel
│   ├── ConfigForm
│   ├── ProgressBar
│   └── ResultsTable
│
├── PairsTable (Container)
│   ├── TableToolbar
│   │   ├── SearchInput
│   │   ├── FilterDropdown
│   │   └── SortControls
│   ├── DataTable (Presentational)
│   │   ├── TableHeader
│   │   ├── VirtualizedRows
│   │   │   └── PairRow
│   │   │       ├── SymbolCell
│   │   │       ├── ScoreCell
│   │   │       ├── SparklineCell
│   │   │       └── ActionCell
│   │   └── TableFooter
│   └── PairDetailModal
│       ├── ChartTabs
│       ├── StatsPanel
│       └── TradeActions
│
├── MultiTimeframePanel
│   ├── TimeframeSelector
│   ├── ConfluenceScore
│   └── TimeframeGrid
│
└── HistoryPanel
    ├── Timeline
    ├── SnapshotCards
    └── ExportButton
```

## State Management Split

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVER STATE (TanStack Query)                   │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  - Klines data (cached)                                        │  │
│  │  - Ticker information                                          │  │
│  │  - Exchange info                                               │  │
│  │  - WebSocket price updates                                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                      CLIENT STATE (Zustand)                          │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  - Scan progress                                               │  │
│  │  - Current primary pair                                        │  │
│  │  - Filter settings                                             │  │
│  │  - UI state (modals, selections)                               │  │
│  │  - Analysis results (computed)                                 │  │
│  └───────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                      PERSISTENT STATE (localStorage)                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  - Historical snapshots                                        │  │
│  │  - User preferences                                            │  │
│  │  - Cached scan results (optional)                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Dependencies

```
                    ┌──────────────┐
                    │     App      │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
 ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
 │    Scan      │  │   Analysis   │  │   Backtest   │
 │   Feature    │  │   Feature    │  │   Feature    │
 └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Shared    │
                    │  (UI, Utils) │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  External    │
                    │  (Binance)   │
                    └──────────────┘

Rules:
- Features can depend on Shared
- Features can depend on External (via Shared)
- Features should NOT depend on other Features
- Shared should NOT depend on Features
```

## File Naming Conventions

```
features/
  scan/
    ├── index.ts                    # Public API barrel export
    ├── types.ts                    # Feature types
    ├── constants.ts                # Feature constants
    ├── utils.ts                    # Pure functions
    ├── utils.test.ts               # Co-located tests
    │
    ├── store/
    │   ├── scan-store.ts           # Main store
    │   ├── selectors.ts            # Memoized selectors
    │   └── actions.ts              # Complex actions
    │
    ├── hooks/
    │   ├── use-scan.ts             # Main hook
    │   ├── use-progress.ts         # Sub-hook
    │   └── use-scan.test.ts        # Hook tests
    │
    └── components/
        ├── scan-button.tsx
        ├── scan-button.test.tsx
        ├── scan-progress.tsx
        └── index.ts                # Barrel export
```
