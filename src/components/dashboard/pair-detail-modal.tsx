/* eslint-disable max-lines */
'use client'

import { X, ExternalLink, TrendingUp, BarChart3, Activity, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SpreadChart } from '@/components/charts/spread-chart'
import { PriceComparisonChart } from '@/components/charts/price-comparison-chart'
import { BacktestPanel } from '@/components/dashboard/backtest-panel'
import { useScan } from '@/components/scan-context'
import { calculateSpread, pearsonCorrelation, calculateReturns } from '@/lib/analysis'
import type { PairAnalysisResult, SignalQuality } from '@/types'

interface PairDetailModalProps {
  pair: PairAnalysisResult
  onClose: () => void
}

function getSignalBadgeClass(quality: SignalQuality) {
  switch (quality) {
    case 'premium':
      return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0'
    case 'strong':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'moderate':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'weak':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    case 'noisy':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    default:
      return 'bg-gray-500/20 text-gray-400'
  }
}

function getSignalLabel(quality: SignalQuality) {
  switch (quality) {
    case 'premium':
      return '💎 Premium'
    case 'strong':
      return '💪 Strong'
    case 'moderate':
      return '📊 Moderate'
    case 'weak':
      return '📉 Weak'
    case 'noisy':
      return '🔊 Noisy'
    default:
      return quality
  }
}

interface ChartData {
  primaryCloses: number[]
  secondaryCloses: number[]
  timestamps: number[]
  spread: number[]
  rollingCorrelations: number[]
}

function useChartData(pair: PairAnalysisResult): ChartData | null {
  const { results, currentPrimaryPair } = useScan()

  return useMemo(() => {
    const primaryResult = results.find(r => r.symbol === currentPrimaryPair)
    const secondaryResult = results.find(r => r.symbol === pair.symbol)

    if (!primaryResult || !secondaryResult) {
      return null
    }

    const primaryCloses = primaryResult.closePrices
    const secondaryCloses = secondaryResult.closePrices
    const timestamps = primaryResult.klines.map(k => k.openTime)

    const length = Math.min(primaryCloses.length, secondaryCloses.length)
    const alignedPrimary = primaryCloses.slice(-length)
    const alignedSecondary = secondaryCloses.slice(-length)
    const alignedTimestamps = timestamps.slice(-length)

    const spread = calculateSpread(alignedPrimary, alignedSecondary)

    const windowSize = 50
    const rollingCorrelations: number[] = []
    const returnsPrimary = calculateReturns(alignedPrimary)
    const returnsSecondary = calculateReturns(alignedSecondary)

    for (let i = windowSize; i <= returnsPrimary.length; i++) {
      const windowPrimary = returnsPrimary.slice(i - windowSize, i)
      const windowSecondary = returnsSecondary.slice(i - windowSize, i)
      rollingCorrelations.push(pearsonCorrelation(windowPrimary, windowSecondary))
    }

    return {
      primaryCloses: alignedPrimary,
      secondaryCloses: alignedSecondary,
      timestamps: alignedTimestamps,
      spread,
      rollingCorrelations,
    }
  }, [results, pair.symbol, currentPrimaryPair])
}

function ConfluenceSection({ pair }: { pair: PairAnalysisResult }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Confluence Analysis
          <Badge
            variant="outline"
            className={
              pair.confluence.rating >= 3
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : pair.confluence.rating >= 2
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
            }
          >
            {pair.confluence.rating}/3 - {pair.confluence.ratingLabel}
          </Badge>
        </CardTitle>
        <CardDescription>
          Multi-method confluence requires at least 2 of 3 indicators to agree
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pair.confluence.indicatorDetails.map((indicator, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border ${
                indicator.active
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-slate-500/5 border-slate-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${indicator.active ? 'bg-emerald-400' : 'bg-slate-400'}`}
                />
                <span className="text-sm font-medium">{indicator.name}</span>
              </div>
              <div
                className={`text-lg font-mono mt-1 ${indicator.active ? 'text-emerald-400' : 'text-slate-400'}`}
              >
                {indicator.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {indicator.active ? '✓ Active' : '✗ Inactive'}
              </div>
            </div>
          ))}
        </div>
        {pair.confluence.meetsThreshold && (
          <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-emerald-400">
              <span className="text-sm font-medium">✓ Meets Confluence Threshold (≥2/3)</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Signal direction:{' '}
              <span className="font-medium">
                {pair.confluence.direction === 'long_spread'
                  ? 'Long Spread (Mean Reversion Up)'
                  : pair.confluence.direction === 'short_spread'
                    ? 'Short Spread (Mean Reversion Down)'
                    : 'Neutral'}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function NotesSection({ notes }: { notes: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Analysis Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {notes.map((note, idx) => (
            <li key={idx} className="text-sm text-muted-foreground">
              {note}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function DetailedMetrics({ pair }: { pair: PairAnalysisResult }) {
  const metrics = [
    { label: 'Raw Z-Score', value: pair.volatilitySpread.rawZScore.toFixed(3) },
    { label: 'Adjusted Z-Score', value: pair.volatilitySpread.adjustedZScore.toFixed(3) },
    { label: 'Signal Strength', value: `${pair.volatilitySpread.signalStrength.toFixed(1)}%` },
    {
      label: 'Primary Vol',
      value: `${(pair.volatilitySpread.primaryVolatility * 100).toFixed(2)}%`,
    },
    {
      label: 'Secondary Vol',
      value: `${(pair.volatilitySpread.secondaryVolatility * 100).toFixed(2)}%`,
    },
    { label: 'Corr Velocity', value: `${pair.correlationVelocity.velocity.toFixed(5)}/bar` },
    { label: 'Spread Mean', value: pair.spreadMean.toFixed(6) },
    { label: 'Spread Std', value: pair.spreadStd.toFixed(6) },
    { label: 'Price Ratio', value: pair.ratio.toFixed(6) },
    { label: 'Aligned Bars', value: pair.alignedBars.toString() },
    { label: 'Regime', value: pair.correlationVelocity.regime.replace(/_/g, ' ') },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Detailed Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {metrics.map(m => (
            <div key={m.label}>
              <span className="text-muted-foreground">{m.label}:</span>
              <span className="ml-2 font-mono">{m.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  className?: string
}

function MetricCard({ icon, label, value, className }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-1">
          {icon}
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${className}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function KeyMetrics({ pair }: { pair: PairAnalysisResult }) {
  const correlationClass =
    Math.abs(pair.correlation) >= 0.7
      ? 'text-emerald-500'
      : Math.abs(pair.correlation) >= 0.4
        ? 'text-yellow-500'
        : 'text-muted-foreground'

  const zScoreClass =
    Math.abs(pair.spreadZScore) >= 2
      ? 'text-purple-400'
      : Math.abs(pair.spreadZScore) >= 1
        ? 'text-pink-400'
        : 'text-muted-foreground'

  const opportunityClass =
    pair.opportunityScore >= 70
      ? 'text-emerald-500'
      : pair.opportunityScore >= 40
        ? 'text-yellow-500'
        : 'text-muted-foreground'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        icon={<TrendingUp className="h-3 w-3" />}
        label="Correlation"
        value={`${pair.correlation >= 0 ? '+' : ''}${pair.correlation.toFixed(3)}`}
        className={correlationClass}
      />
      <MetricCard
        icon={<BarChart3 className="h-3 w-3" />}
        label="Spread Z-Score"
        value={`${pair.spreadZScore >= 0 ? '+' : ''}${pair.spreadZScore.toFixed(2)}σ`}
        className={zScoreClass}
      />
      <MetricCard
        icon={<Activity className="h-3 w-3" />}
        label="Volatility"
        value={`${(pair.volatilitySpread.combinedVolatility * 100).toFixed(2)}%`}
      />
      <MetricCard
        icon={<Zap className="h-3 w-3" />}
        label="Opportunity"
        value={`${pair.opportunityScore}%`}
        className={opportunityClass}
      />
    </div>
  )
}

function ModalHeader({
  pair,
  primaryPair,
  onClose,
}: {
  pair: PairAnalysisResult
  primaryPair: string
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card z-10">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold">
          {pair.symbol.replace('USDT', '')}/USDT
          <span className="text-muted-foreground font-normal ml-2">vs {primaryPair}</span>
        </h2>
        <Badge
          variant="outline"
          className={getSignalBadgeClass(pair.volatilitySpread.signalQuality)}
        >
          {getSignalLabel(pair.volatilitySpread.signalQuality)}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() =>
            window.open(
              `https://www.tradingview.com/chart/?symbol=BINANCE:${pair.symbol}`,
              '_blank'
            )
          }
        >
          TradingView
          <ExternalLink className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function ChartsSection({
  chartData,
  pair,
  primaryPair,
}: {
  chartData: ChartData
  pair: PairAnalysisResult
  primaryPair: string
}) {
  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Price Comparison (% Change)</CardTitle>
          <CardDescription>Normalized price movement from start of analysis period</CardDescription>
        </CardHeader>
        <CardContent>
          <PriceComparisonChart
            primaryPrices={chartData.primaryCloses}
            secondaryPrices={chartData.secondaryCloses}
            primaryLabel={primaryPair.replace('USDT', '')}
            secondaryLabel={pair.symbol.replace('USDT', '')}
            timestamps={chartData.timestamps}
            height={200}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Log Spread</CardTitle>
          <CardDescription>Spread = log(primary) - log(secondary) with ±2σ bands</CardDescription>
        </CardHeader>
        <CardContent>
          <SpreadChart
            spread={chartData.spread}
            mean={pair.spreadMean}
            std={pair.spreadStd}
            timestamps={chartData.timestamps}
            height={200}
          />
        </CardContent>
      </Card>
    </>
  )
}

export function PairDetailModal({ pair, onClose }: PairDetailModalProps) {
  const { currentPrimaryPair } = useScan()
  const chartData = useChartData(pair)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="bg-card border rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <ModalHeader pair={pair} primaryPair={currentPrimaryPair} onClose={onClose} />

        <div className="p-4 space-y-6">
          <KeyMetrics pair={pair} />
          {chartData && (
            <ChartsSection chartData={chartData} pair={pair} primaryPair={currentPrimaryPair} />
          )}
          <ConfluenceSection pair={pair} />
          <NotesSection notes={pair.notes} />
          <BacktestPanel symbol={pair.symbol} />
          <DetailedMetrics pair={pair} />
        </div>
      </div>
    </div>
  )
}
