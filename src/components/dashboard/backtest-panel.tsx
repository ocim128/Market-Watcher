/* eslint-disable max-lines */
'use client'

import { useEffect, useMemo } from 'react'
import { Play, RotateCcw, TrendingUp, TrendingDown, Target, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useScan } from '@/components/scan-context'
import { useBacktest } from '@/hooks/use-backtest'
import { useOptimizedParams } from '@/hooks/use-optimized-params'
import { OptimizationPanel } from '@/components/dashboard/optimization-panel'
import { OptimizationBadge } from '@/components/dashboard/optimization-badge'
import type { Trade } from '@/types/backtest-types'

interface BacktestPanelProps {
  symbol: string
}

function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

function getTradeColor(trade: Trade): string {
  if (trade.exitReason === 'take_profit') {
    return 'text-emerald-500'
  }
  if (trade.exitReason === 'stop_loss') {
    return 'text-red-500'
  }
  return 'text-yellow-500'
}

function getExitBadge(exitReason: Trade['exitReason']) {
  switch (exitReason) {
    case 'take_profit':
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">TP</Badge>
    case 'stop_loss':
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">SL</Badge>
    case 'end_of_data':
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">EOD</Badge>
  }
}

interface ConfigInputProps {
  label: string
  value: number
  step: string
  min: number
  max: number
  onChange: (value: number) => void
}

function ConfigInput({ label, value, step, min, max, onChange }: ConfigInputProps) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full px-2 py-1 rounded bg-background border text-sm"
      />
    </div>
  )
}

function BacktestConfig({
  config,
  onChange,
}: {
  config: {
    entrySpreadThreshold: number
    minCorrelation: number
    takeProfitPercent: number
    stopLossPercent: number
  }
  onChange: (partial: Partial<typeof config>) => void
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
      <ConfigInput
        label="Entry Spread (|Z|)"
        value={config.entrySpreadThreshold}
        step="0.5"
        min={1}
        max={5}
        onChange={v => onChange({ entrySpreadThreshold: Math.abs(v) || 3 })}
      />
      <ConfigInput
        label="Min Correlation"
        value={config.minCorrelation}
        step="0.05"
        min={0.5}
        max={0.95}
        onChange={v => onChange({ minCorrelation: v || 0.7 })}
      />
      <ConfigInput
        label="Take Profit (%)"
        value={config.takeProfitPercent}
        step="0.1"
        min={0.1}
        max={5}
        onChange={v => onChange({ takeProfitPercent: v || 0.5 })}
      />
      <ConfigInput
        label="Stop Loss (%)"
        value={config.stopLossPercent}
        step="0.1"
        min={0.1}
        max={5}
        onChange={v => onChange({ stopLossPercent: v || 0.5 })}
      />
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          {icon}
          {label}
        </div>
        <div className={`text-xl font-bold ${className}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function ResultsSummary({
  result,
}: {
  result: NonNullable<ReturnType<typeof useBacktest>['result']>
}) {
  const profitClass = result.summary.totalProfitPercent >= 0 ? 'text-emerald-500' : 'text-red-500'
  const winRateClass = result.summary.winRate >= 50 ? 'text-emerald-500' : 'text-yellow-500'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={<Target className="h-3 w-3" />}
        label="Total Profit"
        value={formatPercent(result.summary.totalProfitPercent)}
        className={profitClass}
      />
      <StatCard
        icon={<TrendingUp className="h-3 w-3" />}
        label="Win Rate"
        value={`${result.summary.winRate.toFixed(1)}%`}
        className={winRateClass}
      />
      <StatCard
        icon={<TrendingDown className="h-3 w-3" />}
        label="Max Drawdown"
        value={formatPercent(-Math.abs(result.summary.maxDrawdownPercent))}
        className="text-red-500"
      />
      <StatCard
        icon={<Timer className="h-3 w-3" />}
        label="Total Trades"
        value={
          <>
            {result.summary.totalTrades}
            <span className="text-xs text-muted-foreground ml-1">
              ({result.summary.winningTrades}W / {result.summary.losingTrades}L)
            </span>
          </>
        }
      />
    </div>
  )
}

function AdditionalStats({
  result,
}: {
  result: NonNullable<ReturnType<typeof useBacktest>['result']>
}) {
  return (
    <div className="grid grid-cols-4 gap-4 text-sm p-3 bg-muted/30 rounded-lg">
      <div>
        <span className="text-muted-foreground">Profit Factor:</span>
        <span className="ml-2 font-mono">
          {result.summary.profitFactor === Infinity ? '∞' : result.summary.profitFactor.toFixed(2)}
        </span>
      </div>
      <div>
        <span className="text-muted-foreground">Avg Trade:</span>
        <span
          className={`ml-2 font-mono ${result.summary.averageProfitPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {formatPercent(result.summary.averageProfitPercent)}
        </span>
      </div>
      <div>
        <span className="text-muted-foreground">Best Trade:</span>
        <span className="ml-2 font-mono text-emerald-400">
          {formatPercent(result.summary.largestWin)}
        </span>
      </div>
      <div>
        <span className="text-muted-foreground">Worst Trade:</span>
        <span className="ml-2 font-mono text-red-400">
          {formatPercent(result.summary.largestLoss)}
        </span>
      </div>
    </div>
  )
}

function TradeDirection({
  trade,
  symbol,
  primaryPair,
}: {
  trade: Trade
  symbol: string
  primaryPair: string
}) {
  const isLong = trade.direction === 'long_primary'

  return (
    <div className="flex flex-col text-xs">
      <span className={isLong ? 'text-emerald-400' : 'text-red-400'}>
        {isLong ? 'LONG' : 'SHORT'} {primaryPair.replace('USDT', '')}
      </span>
      <span className={isLong ? 'text-red-400' : 'text-emerald-400'}>
        {isLong ? 'SHORT' : 'LONG'} {symbol.replace('USDT', '')}
      </span>
    </div>
  )
}

function TradesTable({
  trades,
  symbol,
  primaryPair,
}: {
  trades: Trade[]
  symbol: string
  primaryPair: string
}) {
  return (
    <div className="max-h-64 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-card">
          <tr className="text-muted-foreground text-xs border-b">
            <th className="text-left py-2 px-2">#</th>
            <th className="text-left py-2 px-2">Direction</th>
            <th className="text-right py-2 px-2">Entry Z</th>
            <th className="text-right py-2 px-2">Exit Z</th>
            <th className="text-right py-2 px-2">P&L</th>
            <th className="text-center py-2 px-2">Exit</th>
            <th className="text-right py-2 px-2">Bars</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, idx) => (
            <tr key={idx} className="border-b border-muted/30 hover:bg-muted/20">
              <td className="py-2 px-2 text-muted-foreground">{idx + 1}</td>
              <td className="py-2 px-2">
                <TradeDirection trade={trade} symbol={symbol} primaryPair={primaryPair} />
              </td>
              <td className="py-2 px-2 text-right font-mono">
                {trade.entrySpread >= 0 ? '+' : ''}
                {trade.entrySpread.toFixed(2)}σ
              </td>
              <td className="py-2 px-2 text-right font-mono">
                {trade.exitSpread >= 0 ? '+' : ''}
                {trade.exitSpread.toFixed(2)}σ
              </td>
              <td className={`py-2 px-2 text-right font-mono ${getTradeColor(trade)}`}>
                {formatPercent(trade.profitPercent)}
              </td>
              <td className="py-2 px-2 text-center">{getExitBadge(trade.exitReason)}</td>
              <td className="py-2 px-2 text-right text-muted-foreground">{trade.durationBars}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NoResultsState() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <p>No trades found with current parameters.</p>
      <p className="text-sm mt-2">
        Try lowering the entry spread threshold or correlation requirement.
      </p>
    </div>
  )
}

function InitialState() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <p>Configure parameters and click &quot;Run Backtest&quot; to simulate trading.</p>
    </div>
  )
}

interface PriceData {
  primaryCloses: number[]
  secondaryCloses: number[]
}

function useBacktestPanelState(symbol: string) {
  const { results, currentPrimaryPair } = useScan()
  const { config: btConfig, setConfig, result, isRunning, run, reset } = useBacktest()
  const {
    optimizedParams,
    settings,
    isOptimizing,
    error: optimizationError,
    setSettings,
    optimize,
    applyOptimizedConfig,
    resetOptimization,
  } = useOptimizedParams()

  const priceData: PriceData | null = useMemo(() => {
    const primaryResult = results.find(r => r.symbol === currentPrimaryPair)
    const secondaryResult = results.find(r => r.symbol === symbol)
    if (!primaryResult || !secondaryResult) {
      return null
    }
    return {
      primaryCloses: primaryResult.closePrices,
      secondaryCloses: secondaryResult.closePrices,
    }
  }, [results, symbol, currentPrimaryPair])

  const handleRun = () => {
    if (!priceData) {
      return
    }
    run(priceData.primaryCloses, priceData.secondaryCloses, symbol, currentPrimaryPair)
  }

  const handleOptimize = () => {
    if (!priceData) {
      return
    }
    optimize(priceData.primaryCloses, priceData.secondaryCloses)
  }

  const handleApplyOptimized = () => {
    applyOptimizedConfig(setConfig)
  }

  useEffect(() => {
    resetOptimization()
  }, [symbol, currentPrimaryPair, resetOptimization])

  return {
    btConfig,
    setConfig,
    result,
    isRunning,
    reset,
    priceData,
    handleRun,
    currentPrimaryPair,
    optimizedParams,
    settings,
    isOptimizing,
    optimizationError,
    setSettings,
    handleOptimize,
    handleApplyOptimized,
  }
}

function PanelHeader({
  isRunning,
  onReset,
  onRun,
  hasPriceData,
  optimizedParams,
}: {
  isRunning: boolean
  onReset: () => void
  onRun: () => void
  hasPriceData: boolean
  optimizedParams: ReturnType<typeof useOptimizedParams>['optimizedParams']
}) {
  return (
    <CardHeader className="pb-4">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            Backtest
            <OptimizationBadge optimizedParams={optimizedParams} />
          </CardTitle>
          <CardDescription>
            Simulate trading performance with configurable parameters
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onReset} disabled={isRunning}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={onRun}
            disabled={isRunning || !hasPriceData}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            <Play className="h-4 w-4 mr-1" />
            {isRunning ? 'Running...' : 'Run Backtest'}
          </Button>
        </div>
      </div>
    </CardHeader>
  )
}

export function BacktestPanel({ symbol }: BacktestPanelProps) {
  const {
    btConfig,
    setConfig,
    result,
    isRunning,
    reset,
    priceData,
    handleRun,
    currentPrimaryPair,
    optimizedParams,
    settings,
    isOptimizing,
    optimizationError,
    setSettings,
    handleOptimize,
    handleApplyOptimized,
  } = useBacktestPanelState(symbol)

  return (
    <Card className="mt-4">
      <PanelHeader
        isRunning={isRunning}
        onReset={reset}
        onRun={handleRun}
        hasPriceData={!!priceData}
        optimizedParams={optimizedParams}
      />

      <CardContent className="space-y-4">
        <BacktestConfig config={btConfig} onChange={setConfig} />
        <OptimizationPanel
          settings={settings}
          optimizedParams={optimizedParams}
          isOptimizing={isOptimizing}
          error={optimizationError}
          hasPriceData={!!priceData}
          onSettingsChange={setSettings}
          onOptimize={handleOptimize}
          onApply={handleApplyOptimized}
        />

        {result && result.trades.length > 0 && (
          <>
            <ResultsSummary result={result} />
            <AdditionalStats result={result} />
            <TradesTable trades={result.trades} symbol={symbol} primaryPair={currentPrimaryPair} />
          </>
        )}

        {result && result.trades.length === 0 && <NoResultsState />}
        {!result && <InitialState />}
      </CardContent>
    </Card>
  )
}
