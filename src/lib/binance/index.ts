// Binance API Client
// Functions for interacting with Binance API

export {
  fetchKlines,
  fetchKlinesPaged,
  fetchKlinesSmart,
  fetchMultipleKlines,
  getTopUsdtPairs,
  getExchangeInfo,
  get24hrTickers,
  extractClosePrices,
  parseKline,
} from './client'

export { resampleKlines, resolveFetchInterval } from './resample'
