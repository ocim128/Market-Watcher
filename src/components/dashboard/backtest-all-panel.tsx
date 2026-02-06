/* eslint-disable max-lines */
'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Target,
  Trophy,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useScan } from '@/components/scan-context'
import { runBacktest } from '@/lib/analysis/backtest-engine'
import type { BacktestConfig, BacktestResult } from '@/types/backtest-types'
import { DEFAULT_BACKTEST_CONFIG } from '@/types/backtest-types'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkline } from '@/components/ui/sparkline'

interface BacktestAllPanelProps {
  onPairClick?: (symbol: string) => void
}

function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

function parseInputNumber(raw: string): number {
  const normalized = raw.replace(',', '.')
  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) ? value : 0
}

interface CombinedStats {
  totalPairs: number
  profitablePairs: number
  totalTrades: number
  totalWins: number
  totalLosses: number
  combinedProfit: number
  averageWinRate: number
  bestPair: { symbol: string; profit: number } | null
  worstPair: { symbol: string; profit: number } | null
}

function calculateCombinedStats(results: BacktestResult[]): CombinedStats {
  const validResults = results.filter(r => r.trades.length > 0)

  if (validResults.length === 0) {
    return {
      totalPairs: 0,
      profitablePairs: 0,
      totalTrades: 0,
      totalWins: 0,
      totalLosses: 0,
      combinedProfit: 0,
      averageWinRate: 0,
      bestPair: null,
      worstPair: null,
    }
  }

  const totalTrades = validResults.reduce((sum, r) => sum + r.summary.totalTrades, 0)
  const totalWins = validResults.reduce((sum, r) => sum + r.summary.winningTrades, 0)
  const totalLosses = validResults.reduce((sum, r) => sum + r.summary.losingTrades, 0)
  const combinedProfit = validResults.reduce((sum, r) => sum + r.summary.totalProfitPercent, 0)
  const profitablePairs = validResults.filter(r => r.summary.totalProfitPercent > 0).length

  // Find best and worst pairs
  const sorted = [...validResults].sort(
    (a, b) => b.summary.totalProfitPercent - a.summary.totalProfitPercent
  )
  const bestPair = sorted[0]
    ? { symbol: sorted[0].symbol, profit: sorted[0].summary.totalProfitPercent }
    : null
  const worstPair = sorted[sorted.length - 1]
    ? {
        symbol: sorted[sorted.length - 1].symbol,
        profit: sorted[sorted.length - 1].summary.totalProfitPercent,
      }
    : null

  return {
    totalPairs: validResults.length,
    profitablePairs,
    totalTrades,
    totalWins,
    totalLosses,
    combinedProfit,
    averageWinRate: totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0,
    bestPair,
    worstPair,
  }
}

interface ConfigInputProps {
  label: string
  value: number
  step: string
  min: number
  max: number
  colorClass?: string
  onChange: (value: number) => void
}

function ConfigInput({
  label,
  value,
  step,
  min,
  max,
  colorClass = '',
  onChange,
}: ConfigInputProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
        {label}
      </label>
      <div className="relative">
        <input
          type="number"
          step={step}
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(parseInputNumber(e.target.value))}
          className={`w-full px-3 py-2 rounded-lg bg-background/50 border border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono ${colorClass}`}
        />
      </div>
    </div>
  )
}

function BacktestConfig({
  config,
  onChange,
}: {
  config: BacktestConfig
  onChange: (partial: Partial<BacktestConfig>) => void
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/30 rounded-xl border border-white/5">
      <ConfigInput
        label="Entry Z-Score"
        value={config.entrySpreadThreshold}
        step="0.1"
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
        label="Take Profit %"
        value={config.takeProfitPercent}
        step="0.1"
        min={0.1}
        max={5}
        colorClass="text-emerald-400"
        onChange={v => onChange({ takeProfitPercent: v || 0.5 })}
      />
      <ConfigInput
        label="Stop Loss %"
        value={config.stopLossPercent}
        step="0.1"
        min={0.1}
        max={5}
        colorClass="text-rose-400"
        onChange={v => onChange({ stopLossPercent: v || 0.5 })}
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <Card className="bg-secondary/20 border-white/5">
      <CardContent className="pt-4 px-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase font-bold tracking-wider mb-2">
          <Icon className="h-3 w-3" />
          {label}
        </div>
        <div className={`text-2xl font-bold font-mono tracking-tight ${className}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function CombinedSummary({ stats }: { stats: CombinedStats }) {
  const profitClass =
    stats.combinedProfit >= 0
      ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'
      : 'text-rose-400'
  const winRateClass = stats.averageWinRate >= 50 ? 'text-emerald-400' : 'text-amber-400'

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <StatCard
        icon={Target}
        label="Profit"
        value={formatPercent(stats.combinedProfit)}
        className={profitClass}
      />
      <StatCard
        icon={TrendingUp}
        label="Win Rate"
        value={`${stats.averageWinRate.toFixed(1)}%`}
        className={winRateClass}
      />
      <StatCard
        icon={Trophy}
        label="Success"
        value={
          <>
            {stats.profitablePairs}
            <span className="text-muted-foreground text-lg">/{stats.totalPairs}</span>
          </>
        }
        className="text-primary"
      />
      <StatCard
        icon={TrendingUp}
        label="Best"
        value={
          <>
            <div className="text-sm">{stats.bestPair?.symbol.replace('USDT', '')}</div>
            <div className="text-xs opacity-70">
              {stats.bestPair && formatPercent(stats.bestPair.profit)}
            </div>
          </>
        }
        className="text-emerald-400"
      />
      <StatCard
        icon={TrendingDown}
        label="Worst"
        value={
          <>
            <div className="text-sm">{stats.worstPair?.symbol.replace('USDT', '')}</div>
            <div className="text-xs opacity-70">
              {stats.worstPair && formatPercent(stats.worstPair.profit)}
            </div>
          </>
        }
        className="text-rose-400"
      />
    </div>
  )
}

function AdditionalStats({ stats }: { stats: CombinedStats }) {
  return (
    <div className="grid grid-cols-4 gap-4 text-xs p-4 bg-muted/10 rounded-lg border border-white/5 font-mono">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
          Trades
        </span>
        <span className="text-foreground">{stats.totalTrades}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
          Wins
        </span>
        <span className="text-emerald-400">{stats.totalWins}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
          Losses
        </span>
        <span className="text-rose-400">{stats.totalLosses}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground uppercase font-semibold text-[10px] tracking-wider">
          Avg/Pair
        </span>
        <span
          className={
            stats.combinedProfit / stats.totalPairs >= 0 ? 'text-emerald-400' : 'text-rose-400'
          }
        >
          {formatPercent(stats.combinedProfit / stats.totalPairs)}
        </span>
      </div>
    </div>
  )
}

function TableHeader() {
  return (
    <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
      <tr className="border-b border-white/5">
        <th className="text-left py-3 px-4 w-12">#</th>
        <th className="text-left py-3 px-4">Pair</th>
        <th className="text-right py-3 px-4">Trades</th>
        <th className="text-right py-3 px-4">W/L</th>
        <th className="text-left py-3 px-4 w-24">Equity</th>
        <th className="text-right py-3 px-4">Win Rate</th>
        <th className="text-right py-3 px-4">Profit</th>
        <th className="text-right py-3 px-4">Drawdown</th>
        <th className="text-right py-3 px-4">PF</th>
      </tr>
    </thead>
  )
}

function TableRow({
  result,
  index,
  onClick,
}: {
  result: BacktestResult
  index: number
  onClick?: () => void
}) {
  const equityColor = result.equityCurve[result.equityCurve.length - 1] >= 0 ? '#34d399' : '#fb7185'
  const winRateClass = result.summary.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'
  const profitClass = result.summary.totalProfitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
  const pfDisplay =
    result.summary.profitFactor === Infinity ? '∞' : result.summary.profitFactor.toFixed(2)

  return (
    <tr className="hover:bg-white/5 cursor-pointer transition-colors group" onClick={onClick}>
      <td className="py-2.5 px-4 text-muted-foreground font-mono text-xs">{index + 1}</td>
      <td className="py-2.5 px-4 font-medium relative">
        <span className="text-foreground">{result.symbol.replace('USDT', '')}</span>
        <span className="text-[10px] text-muted-foreground ml-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
          vs {result.primarySymbol.replace('USDT', '')}
        </span>
      </td>
      <td className="py-2.5 px-4 text-right font-mono text-muted-foreground">
        {result.summary.totalTrades}
      </td>
      <td className="py-2.5 px-4 text-right font-mono text-xs">
        <span className="text-emerald-400">{result.summary.winningTrades}</span>
        <span className="text-muted-foreground mx-1">/</span>
        <span className="text-rose-400">{result.summary.losingTrades}</span>
      </td>
      <td className="py-2.5 px-4">
        <div className="w-20 h-6">
          <Sparkline
            data={result.equityCurve}
            width={80}
            height={24}
            color={equityColor}
            strokeWidth={1.5}
            fill
          />
        </div>
      </td>
      <td className={`py-2.5 px-4 text-right font-mono ${winRateClass}`}>
        {result.summary.winRate.toFixed(0)}%
      </td>
      <td className={`py-2.5 px-4 text-right font-mono font-bold ${profitClass}`}>
        {formatPercent(result.summary.totalProfitPercent)}
      </td>
      <td className="py-2.5 px-4 text-right font-mono text-rose-400 text-xs">
        {formatPercent(-Math.abs(result.summary.maxDrawdownPercent))}
      </td>
      <td className="py-2.5 px-4 text-right font-mono text-xs text-muted-foreground">
        {pfDisplay}
      </td>
    </tr>
  )
}

function ResultsTable({
  results,
  onPairClick,
}: {
  results: BacktestResult[]
  onPairClick?: (symbol: string) => void
}) {
  const sortedResults = useMemo(
    () =>
      results
        .filter(r => r.trades.length > 0)
        .sort((a, b) => b.summary.totalProfitPercent - a.summary.totalProfitPercent),
    [results]
  )

  return (
    <div className="rounded-lg border border-white/5 overflow-hidden">
      <div className="max-h-96 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm">
          <TableHeader />
          <tbody className="divide-y divide-white/5">
            {sortedResults.map((result, idx) => (
              <TableRow
                key={`${result.primarySymbol}|${result.symbol}`}
                result={result}
                index={idx}
                onClick={() => onPairClick?.(result.symbol)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NoEligiblePairs({ minCorrelation }: { minCorrelation: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <div className="rounded-full bg-yellow-500/10 p-3 mb-4">
        <AlertTriangle className="h-6 w-6 text-yellow-500" />
      </div>
      <p className="font-medium text-foreground">No Eligible Pairs</p>
      <p className="text-sm mt-1 max-w-xs">
        No pairs meet the minimum correlation threshold of {minCorrelation}. Try lowering it.
      </p>
    </div>
  )
}

function InitialState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border-2 border-dashed border-white/5 rounded-xl">
      <div className="rounded-full bg-primary/10 p-4 mb-4">
        <Target className="h-8 w-8 text-primary/50" />
      </div>
      <p className="font-medium text-foreground">Ready for Analysis</p>
      <p className="text-sm mt-1 max-w-xs">
        Scan the market first to identify correlated pairs for backtesting.
      </p>
    </div>
  )
}

function NoResultsState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
      <div className="rounded-full bg-muted p-3 mb-4">
        <TrendingDown className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="font-medium text-foreground">No Trades Found</p>
      <p className="text-sm mt-1 max-w-xs">
        The strategy didn&apos;t trigger any trades with current settings. Try lowering the entry
        threshold.
      </p>
    </div>
  )
}

function PanelHeader({
  eligibleCount,
  isRunning,
  progress,
  onReset,
  onRun,
}: {
  eligibleCount: number
  isRunning: boolean
  progress: { current: number; total: number }
  onReset: () => void
  onRun: () => void
}) {
  return (
    <CardHeader className="pb-4 border-b border-border/40">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-bold">
              Backtest Strategy
            </span>
            {eligibleCount > 0 && (
              <Badge
                variant="outline"
                className="font-mono font-normal text-xs border-primary/20 bg-primary/5 text-primary"
              >
                {eligibleCount} PAIRS
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Simulate strategy across market data</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={isRunning}
            className="text-xs h-8 border-border/50 hover:bg-white/5"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={onRun}
            disabled={isRunning || eligibleCount === 0}
            className="h-8 text-xs bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
          >
            <Play className="h-3.5 w-3.5 mr-1 fill-current" />
            {isRunning ? `Running ${progress.current}/${progress.total}...` : 'Run Backtest'}
          </Button>
        </div>
      </div>
    </CardHeader>
  )
}

function useBacktestAllState(onPairClick?: (symbol: string) => void) {
  const { results, analysisResults } = useScan()
  const [btConfig, setBtConfig] = useState<BacktestConfig>(DEFAULT_BACKTEST_CONFIG)
  const [backtestResults, setBacktestResults] = useState<BacktestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const priceBySymbol = useMemo(() => {
    const map = new Map<string, number[]>()
    for (const item of results) {
      map.set(item.symbol, item.closePrices)
    }
    return map
  }, [results])

  const eligiblePairs = useMemo(
    () => analysisResults.filter(r => Math.abs(r.correlation) >= btConfig.minCorrelation),
    [analysisResults, btConfig.minCorrelation]
  )

  const combinedStats = useMemo(() => calculateCombinedStats(backtestResults), [backtestResults])

  const handleRunAll = useCallback(async () => {
    setIsRunning(true)
    setBacktestResults([])
    setProgress({ current: 0, total: eligiblePairs.length })

    const allResults: BacktestResult[] = []

    for (let i = 0; i < eligiblePairs.length; i++) {
      const pair = eligiblePairs[i]
      const primaryCloses = priceBySymbol.get(pair.primarySymbol)
      const secondaryCloses = priceBySymbol.get(pair.symbol)

      if (primaryCloses && secondaryCloses) {
        const result = runBacktest(
          primaryCloses,
          secondaryCloses,
          pair.symbol,
          pair.primarySymbol,
          btConfig
        )
        allResults.push(result)
      }

      setProgress({ current: i + 1, total: eligiblePairs.length })
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    setBacktestResults(allResults)
    setIsRunning(false)
  }, [eligiblePairs, priceBySymbol, btConfig])

  const handleReset = () => {
    setBacktestResults([])
    setProgress({ current: 0, total: 0 })
  }

  const setConfig = (partial: Partial<BacktestConfig>) => {
    setBtConfig(prev => ({ ...prev, ...partial }))
  }

  return {
    btConfig,
    setConfig,
    backtestResults,
    isRunning,
    progress,
    eligiblePairs,
    analysisResults,
    combinedStats,
    handleRunAll,
    handleReset,
    onPairClick,
  }
}

export function BacktestAllPanel({ onPairClick }: BacktestAllPanelProps) {
  const {
    btConfig,
    setConfig,
    backtestResults,
    isRunning,
    progress,
    eligiblePairs,
    analysisResults,
    combinedStats,
    handleRunAll,
    handleReset,
  } = useBacktestAllState(onPairClick)

  const hasResults = backtestResults.length > 0
  const hasTrades = hasResults && backtestResults.some(r => r.trades.length > 0)

  return (
    <Card className="mb-6 border-border/40 bg-card/50 backdrop-blur-sm">
      <PanelHeader
        eligibleCount={eligiblePairs.length}
        isRunning={isRunning}
        progress={progress}
        onReset={handleReset}
        onRun={handleRunAll}
      />

      <CardContent className="space-y-6 pt-6">
        <BacktestConfig config={btConfig} onChange={setConfig} />

        <AnimatePresence>
          {hasTrades && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="space-y-6"
            >
              <CombinedSummary stats={combinedStats} />
              <AdditionalStats stats={combinedStats} />
              <ResultsTable results={backtestResults} onPairClick={onPairClick} />
            </motion.div>
          )}
        </AnimatePresence>

        {eligiblePairs.length === 0 && analysisResults.length > 0 && (
          <NoEligiblePairs minCorrelation={btConfig.minCorrelation} />
        )}

        {analysisResults.length === 0 && <InitialState />}

        {hasResults && !hasTrades && <NoResultsState />}
      </CardContent>
    </Card>
  )
}
