import { describe, expect, it } from 'vitest'
import type { BinanceKline } from '@/types'
import { createMemoryCandleStore } from './candle-store'

function createCandle(openTime: number, close: number): BinanceKline {
  return {
    openTime,
    open: String(close - 0.5),
    high: String(close + 0.5),
    low: String(close - 1),
    close: String(close),
    volume: '100',
    closeTime: openTime + 3_599_999,
    quoteAssetVolume: '0',
    numberOfTrades: 10,
    takerBuyBaseVolume: '0',
    takerBuyQuoteVolume: '0',
  }
}

describe('candle-store', () => {
  it('saves and queries candles by time range', async () => {
    const store = createMemoryCandleStore()
    const candles = [
      createCandle(1_000, 10),
      createCandle(2_000, 11),
      createCandle(3_000, 12),
      createCandle(3_000, 12.5),
    ]

    await store.saveCandles('BTCUSDT', '1h', candles)

    const all = await store.getCandles('BTCUSDT', '1h')
    const filtered = await store.getCandles('BTCUSDT', '1h', 1_500, 2_500)

    expect(all).toHaveLength(3)
    expect(all[2].close).toBe('12.5')
    expect(filtered).toHaveLength(1)
    expect(filtered[0].openTime).toBe(2_000)
  })

  it('tracks latest timestamp and clears a symbol', async () => {
    const store = createMemoryCandleStore()
    await store.saveCandles('ETHUSDT', '1h', [createCandle(10_000, 100), createCandle(11_000, 101)])

    expect(await store.getLatestTimestamp('ETHUSDT', '1h')).toBe(11_000)

    await store.clearSymbol('ETHUSDT')
    expect(await store.getCandles('ETHUSDT', '1h')).toHaveLength(0)
    expect(await store.getLatestTimestamp('ETHUSDT', '1h')).toBeNull()
  })

  it('exports and imports JSON/CSV payloads', async () => {
    const sourceStore = createMemoryCandleStore()
    const targetStore = createMemoryCandleStore()

    await sourceStore.saveCandles('SOLUSDT', '1h', [
      createCandle(1_000, 20),
      createCandle(2_000, 21),
    ])

    const jsonPayload = await sourceStore.exportCandles('SOLUSDT', '1h', 'json')
    const csvPayload = await sourceStore.exportCandles('SOLUSDT', '1h', 'csv')

    const jsonImported = await targetStore.importCandles('SOLUSDT', '1h', jsonPayload, 'json')
    const csvImported = await targetStore.importCandles('SOLUSDT', '1h', csvPayload, 'csv')

    const loaded = await targetStore.getCandles('SOLUSDT', '1h')

    expect(jsonImported).toBe(2)
    expect(csvImported).toBe(2)
    expect(loaded).toHaveLength(2)
    expect(loaded[0].openTime).toBe(1_000)
  })
})
