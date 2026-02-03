# Documentation

## Screenshots

Add screenshots of the application here:
- `screenshot.png` - Main dashboard view

## API Reference

### Binance Endpoints Used

| Endpoint | Description |
|----------|-------------|
| `GET /api/v3/klines` | Historical OHLCV data |
| `GET /api/v3/exchangeInfo` | Trading pair metadata |
| `GET /api/v3/ticker/24hr` | 24-hour statistics |

### WebSocket Streams

| Stream | Format | Description |
|--------|--------|-------------|
| Mini Ticker | `<symbol>@miniTicker` | Real-time price updates |

## Analysis Methodology

### Correlation Calculation

Uses Pearson correlation on log returns:
```
r = Σ[(xi - x̄)(yi - ȳ)] / √[Σ(xi - x̄)² × Σ(yi - ȳ)²]
```

### Spread Z-Score

Measures how far the current spread is from its mean:
```
spread = log(primary_price) - log(secondary_price)
z_score = (current_spread - mean_spread) / std_spread
```

### Volatility Adjustment

Adjusts Z-score based on combined volatility:
```
adjusted_z = raw_z × (1 + volatility_penalty)
signal_quality = f(|adjusted_z|, combined_volatility)
```

### Opportunity Score

Combined score from 0-100:
```
opportunity = (spread_opportunity × 0.6) + (signal_strength × 0.4)
```
