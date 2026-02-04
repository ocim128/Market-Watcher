'use client'

import { useMemo } from 'react'
import { ExternalLink, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableCell } from '@/components/ui/table'
import { Sparkline } from '@/components/ui/sparkline'
import { calculateSpread } from '@/lib/analysis/statistics'
import { motion } from 'framer-motion'
import type { PairAnalysisResult } from '@/types'
import {
  getSignalBadgeClass,
  getSignalLabel,
  getRegimeLabel,
  getCorrelationColorClass,
  getZScoreColorClass,
  getOpportunityScoreColorClass,
  getOpportunityScoreBarClass,
  getConfluenceBadgeClass,
  getConfluenceColorClass,
  getConfluenceLabel,
} from './utils'

interface PairRowProps {
  pair: PairAnalysisResult
  currentPrimaryPair: string
  primaryPrices: number[]
  pairPrices: number[]
  onSelect: () => void
}

interface SparklineData {
  spread: number[]
  color: string
}

function useSpreadSparkline(primaryPrices: number[], pairPrices: number[]): SparklineData {
  return useMemo(() => {
    if (primaryPrices.length === 0 || pairPrices.length === 0) {
      return { spread: [], color: '#34d399' }
    }

    const len = Math.min(primaryPrices.length, pairPrices.length)
    const lookback = 40
    const startIndex = Math.max(0, len - lookback)
    const pSlice = primaryPrices.slice(startIndex, len)
    const sSlice = pairPrices.slice(startIndex, len)
    const spread = calculateSpread(pSlice, sSlice)

    const color =
      spread.length > 0 && spread[spread.length - 1] >= spread[0] ? '#34d399' : '#fb7185'
    return { spread, color }
  }, [primaryPrices, pairPrices])
}

function PairSymbol({ symbol, primarySymbol }: { symbol: string; primarySymbol: string }) {
  return (
    <TableCell className="font-medium">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{symbol.replace('USDT', '')}</span>
          <span className="text-[10px] text-muted-foreground">
            vs {primarySymbol.replace('USDT', '')}
          </span>
        </div>
      </div>
    </TableCell>
  )
}

function CorrelationCell({ correlation }: { correlation: number }) {
  return (
    <TableCell>
      <div className="flex flex-col">
        <span className={`font-mono font-medium ${getCorrelationColorClass(correlation)}`}>
          {correlation >= 0 ? '+' : ''}
          {correlation.toFixed(3)}
        </span>
      </div>
    </TableCell>
  )
}

function TrendCell({ spread, color }: { spread: number[]; color: string }) {
  return (
    <TableCell>
      <div className="w-24 h-8">
        <Sparkline data={spread} width={96} height={32} color={color} fill={true} />
      </div>
    </TableCell>
  )
}

function ZScoreCell({ zScore }: { zScore: number }) {
  return (
    <TableCell>
      <span className={`font-mono font-bold ${getZScoreColorClass(zScore)}`}>
        {zScore >= 0 ? '+' : ''}
        {zScore.toFixed(2)}σ
      </span>
    </TableCell>
  )
}

function SignalCell({ quality }: { quality: string }) {
  const label = getSignalLabel(quality as PairAnalysisResult['volatilitySpread']['signalQuality'])
  const shortLabel = label.split(' ')[1] || quality

  return (
    <TableCell>
      <Badge
        variant="outline"
        className={`uppercase text-[10px] tracking-wider ${getSignalBadgeClass(
          quality as PairAnalysisResult['volatilitySpread']['signalQuality']
        )}`}
      >
        {shortLabel}
      </Badge>
    </TableCell>
  )
}

function RegimeCell({ regime }: { regime: string }) {
  return (
    <TableCell>
      <span className="text-xs text-muted-foreground">{getRegimeLabel(regime)}</span>
    </TableCell>
  )
}

function ConfluenceCell({ rating, label }: { rating: number; label: string }) {
  return (
    <TableCell>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`text-[10px] tracking-wider ${getConfluenceBadgeClass(rating)}`}
          title={label}
        >
          {rating}/3
        </Badge>
        <span className={`text-xs ${getConfluenceColorClass(rating)}`}>
          {getConfluenceLabel(rating)}
        </span>
      </div>
    </TableCell>
  )
}

function OpportunityCell({ score }: { score: number }) {
  return (
    <TableCell>
      <div className="flex items-center gap-3">
        <div className="w-16 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${getOpportunityScoreBarClass(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`font-mono text-sm font-bold ${getOpportunityScoreColorClass(score)}`}>
          {score}
        </span>
      </div>
    </TableCell>
  )
}

function ActionsCell({ symbol, onSelect }: { symbol: string; onSelect: () => void }) {
  return (
    <TableCell>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
          title="View Details"
          onClick={e => {
            e.stopPropagation()
            onSelect()
          }}
        >
          <Info className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-400"
          title="Open in TradingView"
          onClick={e => {
            e.stopPropagation()
            window.open(`https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}`, '_blank')
          }}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </TableCell>
  )
}

export function PairRow({
  pair,
  currentPrimaryPair,
  primaryPrices,
  pairPrices,
  onSelect,
}: PairRowProps) {
  const { spread: recentSpread, color: sparklineColor } = useSpreadSparkline(
    primaryPrices,
    pairPrices
  )

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      className="border-b transition-colors hover:bg-muted/40 cursor-pointer border-border/50 group relative"
      onClick={onSelect}
    >
      <PairSymbol symbol={pair.symbol} primarySymbol={currentPrimaryPair} />
      <CorrelationCell correlation={pair.correlation} />
      <TrendCell spread={recentSpread} color={sparklineColor} />
      <ZScoreCell zScore={pair.spreadZScore} />
      <SignalCell quality={pair.volatilitySpread.signalQuality} />
      <RegimeCell regime={pair.correlationVelocity.regime} />
      <ConfluenceCell rating={pair.confluence.rating} label={pair.confluence.ratingLabel} />
      <OpportunityCell score={pair.opportunityScore} />
      <ActionsCell symbol={pair.symbol} onSelect={onSelect} />
    </motion.tr>
  )
}
