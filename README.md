# Market Watcher

A real-time pair trading opportunity dashboard for cryptocurrency markets. Analyzes correlations, spread divergences, and volatility to identify mean-reversion scalping opportunities on Binance.

![Market Watcher Dashboard](./docs/screenshot.png)

## Features

### 📊 Statistical Analysis Engine
- **Pearson Correlation** - Measures relationship strength between pairs
- **Spread Z-Score** - Detects divergence from mean (±2σ = extreme)
- **Volatility-Adjusted Spread** - Adjusts signals for market noise
- **Correlation Velocity** - Detects regime changes (strengthening/weakening)

### 💎 Signal Quality Classification
- **Premium** - High spread divergence + low volatility (best entries)
- **Strong** - Good divergence with reasonable volatility
- **Moderate** - Worth monitoring
- **Weak/Noisy** - Low opportunity or unreliable

### 📈 Interactive Charts
- Spread chart with mean and ±2σ bands
- Price comparison (normalized % change)
- Built with [Lightweight Charts](https://github.com/nickvdyck/lightweight-charts)

### ⚡ Real-time Features
- Configurable timeframes (1m, 5m, 15m, 1h, 4h)
- Adjustable lookback period (200-2000 bars)
- Auto-refresh with countdown timer
- Browser notifications for premium signals

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) and click "Scan Pairs" to analyze.

## Configuration

### Default Settings (Scalping)
| Setting | Default | Description |
|---------|---------|-------------|
| Primary Pair | ETHUSDT | Reference pair for comparisons |
| Timeframe | 1 minute | Candle interval |
| Lookback | 500 bars | ~8 hours at 1m |
| Top Pairs | 120 | Number of pairs to analyze |

### Recommended Presets

**Scalping (1-2 hour trades)**
- Timeframe: 1m
- Bars: 500

**Day Trading (4-8 hour trades)**
- Timeframe: 5m
- Bars: 500

**Swing Trading (multi-day)**
- Timeframe: 1h
- Bars: 500

## How It Works

1. **Fetch Data** - Gets OHLCV data from Binance API for top USDT pairs
2. **Calculate Returns** - Computes log returns for correlation analysis
3. **Analyze Pairs** - For each pair vs ETHUSDT:
   - Pearson correlation of returns
   - Log spread (spread = log(ETH) - log(ALT))
   - Z-score of current spread
   - Volatility-adjusted signal quality
   - Correlation velocity (regime detection)
4. **Score Opportunities** - Combined scoring based on:
   - 60% spread divergence opportunity
   - 40% signal quality (volatility-adjusted)
5. **Display Results** - Sorted by opportunity score

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Main dashboard page
│   └── globals.css        # Global styles + Tailwind
├── components/
│   ├── charts/            # Lightweight Charts wrappers
│   ├── dashboard/         # Dashboard components
│   ├── ui/                # shadcn/ui base components
│   └── providers.tsx      # React Query + Theme
├── hooks/
│   ├── use-binance-data.ts    # TanStack Query hooks
│   ├── use-pair-scan.ts       # Scan orchestration
│   ├── use-auto-refresh.ts    # Auto-refresh logic
│   └── use-notifications.ts   # Browser notifications
├── lib/
│   ├── analysis/          # Statistical analysis
│   │   ├── statistics.ts      # Core stats functions
│   │   ├── correlation-velocity.ts
│   │   ├── volatility-spread.ts
│   │   └── pair-analysis.ts   # Main analysis
│   └── binance/           # Binance API client
├── config/                # App configuration
└── types/                 # TypeScript interfaces
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **Charts**: Lightweight Charts v5
- **State**: TanStack Query
- **Theme**: next-themes

## API Usage

This app uses the public Binance API (no API key required):
- `GET /api/v3/klines` - Historical candlestick data
- `GET /api/v3/exchangeInfo` - Trading pair information
- `GET /api/v3/ticker/24hr` - 24-hour price statistics

Rate limits: ~1200 requests/minute (we use delays to stay well under)

## Understanding the Metrics

### Correlation
| Value | Interpretation |
|-------|----------------|
| > 0.7 | Strong positive (good for pairs trading) |
| 0.4-0.7 | Moderate |
| < 0.4 | Weak (risky for pairs trading) |

### Spread Z-Score
| Value | Interpretation |
|-------|----------------|
| > +2σ | Primary overvalued vs secondary (short primary) |
| < -2σ | Primary undervalued vs secondary (long primary) |
| -1 to +1 | Near mean (no clear opportunity) |

### Signal Quality
| Quality | Condition |
|---------|-----------|
| Premium | |Z| > 2 AND volatility < 2% |
| Strong | |Z| > 1.5 AND volatility < 4% |
| Moderate | |Z| > 1 |
| Noisy | volatility > 5% |

## License

MIT

## Acknowledgments

- Statistical analysis ported from [OpenBullet2](https://github.com/openbullet/OpenBullet2) pair trading module
- Charts powered by [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/)
