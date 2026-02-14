'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Search, Download, Upload, Database } from 'lucide-react'
import { useUniverse } from '@/hooks/use-universe'
import {
  createCandleDownloader,
  evaluateSignalOutcome,
  getCandleStore,
  loadSignalHistory,
  mergeSignalHistory,
  runScannerBacktest,
  saveSignalHistory,
  clearSignalHistory,
  scanForSignals,
  type ScannerBacktestResult,
  type ScannerBacktestStats,
  type Signal,
  type SignalHistoryRecord,
} from '@/lib/scanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { UniverseManager } from './universe-manager'
import { SignalHistory } from './signal-history'

function formatDate(value: number | null): string {
  if (!value) {
    return 'Never'
  }
  return new Date(value).toLocaleString()
}

function downloadText(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ScannerPanel() {
  const {
    universe,
    settings,
    lastUpdated,
    isLoading: isUniverseLoading,
    isStale,
    progress: universeProgress,
    error: universeError,
    refreshUniverse,
    setSettings,
  } = useUniverse()

  const candleStore = useMemo(() => getCandleStore(), [])
  const downloader = useMemo(() => createCandleDownloader(candleStore), [candleStore])

  const [signals, setSignals] = useState<Signal[]>([])
  const [historyRecords, setHistoryRecords] = useState<SignalHistoryRecord[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [isBacktesting, setIsBacktesting] = useState(false)
  const [backtestError, setBacktestError] = useState<string | null>(null)
  const [backtestResults, setBacktestResults] = useState<ScannerBacktestResult[]>([])
  const [backtestAggregate, setBacktestAggregate] = useState<ScannerBacktestStats | null>(null)
  const [downloadProgress, setDownloadProgress] = useState({ done: 0, total: 0, symbol: '' })
  const [selectedSymbol, setSelectedSymbol] = useState('')
  const importFileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const loaded = loadSignalHistory()
    setHistoryRecords(loaded)
  }, [])

  useEffect(() => {
    if (!selectedSymbol && universe.length > 0) {
      setSelectedSymbol(universe[0].symbol)
    }
  }, [selectedSymbol, universe])

  const scanNow = useCallback(async () => {
    if (universe.length === 0) {
      return
    }

    setIsScanning(true)
    setScanError(null)

    try {
      await downloader.downloadUniverse(
        universe.map(entry => entry.symbol),
        settings.interval,
        {
          incremental: true,
          concurrency: 5,
          delayMs: 40,
          onProgress: (done, total, symbol) => setDownloadProgress({ done, total, symbol }),
        }
      )

      const detected = await scanForSignals(universe, candleStore, undefined, {
        interval: settings.interval,
        rsiPeriod: 14,
        rsiThreshold: 30,
        lookbackBars: 24,
        maxSignals: 100,
      })

      setSignals(detected)

      const grouped = new Map<string, Signal[]>()
      for (const signal of detected) {
        const list = grouped.get(signal.symbol) ?? []
        list.push(signal)
        grouped.set(signal.symbol, list)
      }

      const evaluated: SignalHistoryRecord[] = []
      for (const [symbol, symbolSignals] of grouped.entries()) {
        const candles = await candleStore.getCandles(symbol, settings.interval)
        for (const signal of symbolSignals) {
          evaluated.push(evaluateSignalOutcome(signal, candles, 3, 10))
        }
      }

      const merged = mergeSignalHistory(loadSignalHistory(), evaluated)
      saveSignalHistory(merged)
      setHistoryRecords(merged)
    } catch (error) {
      setScanError(error instanceof Error ? error.message : 'Scanner failed')
    } finally {
      setIsScanning(false)
    }
  }, [universe, downloader, settings.interval, candleStore])

  const handleExport = useCallback(
    async (format: 'json' | 'csv') => {
      if (!selectedSymbol) {
        return
      }

      const payload = await candleStore.exportCandles(selectedSymbol, settings.interval, format)
      const fileExt = format === 'json' ? 'json' : 'csv'
      downloadText(
        `${selectedSymbol}-${settings.interval}-candles.${fileExt}`,
        payload,
        format === 'json' ? 'application/json' : 'text/csv'
      )
    },
    [candleStore, selectedSymbol, settings.interval]
  )

  const handleImportFile = useCallback(
    async (file: File) => {
      if (!selectedSymbol) {
        return
      }

      const text = await file.text()
      const format: 'json' | 'csv' = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json'
      await candleStore.importCandles(selectedSymbol, settings.interval, text, format)
    },
    [candleStore, selectedSymbol, settings.interval]
  )

  const clearHistoryHandler = () => {
    clearSignalHistory()
    setHistoryRecords([])
  }

  const runBacktestNow = useCallback(async () => {
    if (universe.length === 0) {
      return
    }

    setIsBacktesting(true)
    setBacktestError(null)

    try {
      const result = await runScannerBacktest(universe, candleStore, settings.interval, {
        rsiPeriod: 14,
        rsiThreshold: 30,
        takeProfitPercent: 3,
        stopLossPercent: 4,
        maxHoldBars: 10,
        cooldownBars: 2,
      })

      setBacktestResults(result.results)
      setBacktestAggregate(result.aggregate)
    } catch (error) {
      setBacktestError(error instanceof Error ? error.message : 'Backtest failed')
    } finally {
      setIsBacktesting(false)
    }
  }, [universe, candleStore, settings.interval])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Momentum RSI Scanner</h1>
          <p className="text-sm text-muted-foreground">
            RSI(14) below 30 on high-momentum universe · 3% TP / 10-bar hold
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void refreshUniverse()} disabled={isUniverseLoading || isScanning}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {isUniverseLoading ? 'Refreshing...' : 'Refresh Universe'}
          </Button>
          <Button onClick={() => void scanNow()} disabled={isScanning || universe.length === 0}>
            <Search className="mr-2 h-4 w-4" />
            {isScanning ? 'Scanning...' : 'Scan Now'}
          </Button>
          <Button
            variant="outline"
            onClick={() => void runBacktestNow()}
            disabled={isBacktesting || universe.length === 0}
          >
            {isBacktesting ? 'Backtesting...' : 'Run Backtest'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Universe Pairs</CardDescription>
            <CardTitle className="text-2xl">{universe.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Last updated: {formatDate(lastUpdated)}
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Active Alerts</CardDescription>
            <CardTitle className="text-2xl">{signals.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Interval: {settings.interval}
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="text-xl">
              {isStale ? 'Universe stale' : 'Universe fresh'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {universeProgress.total > 0
              ? `${universeProgress.done}/${universeProgress.total} · ${universeProgress.symbol}`
              : 'Idle'}
          </CardContent>
        </Card>
      </div>

      {(scanError || universeError || backtestError) && (
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="pt-6 text-sm text-rose-500">
            {scanError ?? universeError ?? backtestError}
          </CardContent>
        </Card>
      )}

      <UniverseManager settings={settings} disabled={isScanning} onChange={setSettings} />

      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Candle Data Import/Export</CardTitle>
          <CardDescription>Save and restore candle bars using JSON or CSV</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedSymbol}
              onChange={event => setSelectedSymbol(event.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {universe.map(entry => (
                <option key={entry.symbol} value={entry.symbol}>
                  {entry.symbol}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={() => void handleExport('json')}
              disabled={!selectedSymbol}
            >
              <Download className="mr-2 h-4 w-4" /> Export JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleExport('csv')}
              disabled={!selectedSymbol}
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => importFileInputRef.current?.click()}
              disabled={!selectedSymbol}
            >
              <Upload className="mr-2 h-4 w-4" /> Import JSON/CSV
            </Button>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={event => {
                const file = event.target.files?.[0]
                if (file) {
                  void handleImportFile(file)
                }
                event.target.value = ''
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Selected: {selectedSymbol || 'none'} · Interval: {settings.interval}
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Active Alerts</CardTitle>
          <CardDescription>
            {downloadProgress.total > 0
              ? `Candle sync ${downloadProgress.done}/${downloadProgress.total} · ${downloadProgress.symbol}`
              : 'Run scan to populate alerts'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active alerts yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>RSI</TableHead>
                  <TableHead>Mean Reversion</TableHead>
                  <TableHead>Momentum 3M</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signals.map(signal => (
                  <TableRow key={signal.id}>
                    <TableCell className="font-medium">{signal.symbol}</TableCell>
                    <TableCell>{formatDate(signal.timestamp)}</TableCell>
                    <TableCell>{signal.rsi.toFixed(2)}</TableCell>
                    <TableCell>{signal.meanReversionDist.toFixed(2)}%</TableCell>
                    <TableCell>{signal.momentum3m.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Badge variant={signal.rating >= 70 ? 'default' : 'secondary'}>
                        {signal.rating}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SignalHistory records={historyRecords} onClear={clearHistoryHandler} />

      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Backtest Results</CardTitle>
          <CardDescription>
            Entry: RSI(14) cross below 30 · Exit: +3% TP / -4% SL / 10 bars · Cooldown: 2 bars
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!backtestAggregate ? (
            <p className="text-sm text-muted-foreground">
              Click Run Backtest to evaluate the current universe.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-5">
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground">Trades</p>
                  <p className="text-xl font-semibold">{backtestAggregate.totalTrades}</p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-xl font-semibold">{backtestAggregate.winRate.toFixed(1)}%</p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground">Avg Hold</p>
                  <p className="text-xl font-semibold">
                    {backtestAggregate.avgHoldBars.toFixed(2)} bars
                  </p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground">Profit Factor</p>
                  <p className="text-xl font-semibold">
                    {Number.isFinite(backtestAggregate.profitFactor)
                      ? backtestAggregate.profitFactor.toFixed(2)
                      : '∞'}
                  </p>
                </div>
                <div className="rounded-md border border-border/50 p-3">
                  <p className="text-xs text-muted-foreground">Expectancy</p>
                  <p
                    className={`text-xl font-semibold ${backtestAggregate.expectancyPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}
                  >
                    {backtestAggregate.expectancyPercent >= 0 ? '+' : ''}
                    {backtestAggregate.expectancyPercent.toFixed(2)}%
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead>Win Rate</TableHead>
                    <TableHead>Avg Hold</TableHead>
                    <TableHead>Profit Factor</TableHead>
                    <TableHead>Expectancy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backtestResults
                    .slice()
                    .sort((a, b) => b.stats.expectancyPercent - a.stats.expectancyPercent)
                    .map(result => (
                      <TableRow key={result.symbol}>
                        <TableCell className="font-medium">{result.symbol}</TableCell>
                        <TableCell>{result.stats.totalTrades}</TableCell>
                        <TableCell>{result.stats.winRate.toFixed(1)}%</TableCell>
                        <TableCell>{result.stats.avgHoldBars.toFixed(2)}</TableCell>
                        <TableCell>
                          {Number.isFinite(result.stats.profitFactor)
                            ? result.stats.profitFactor.toFixed(2)
                            : '∞'}
                        </TableCell>
                        <TableCell
                          className={
                            result.stats.expectancyPercent >= 0
                              ? 'text-emerald-500'
                              : 'text-rose-500'
                          }
                        >
                          {result.stats.expectancyPercent >= 0 ? '+' : ''}
                          {result.stats.expectancyPercent.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Implementation Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <Database className="h-4 w-4" /> Candles stored locally with IndexedDB and can be
            exported/imported as JSON/CSV.
          </p>
          <p>Universe ranking: criteria hit count first, then cumulative performance score.</p>
          <p>
            Signal entry: RSI(14) cross below 30 on 1-hour candles with momentum and liquidity
            weighting.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
