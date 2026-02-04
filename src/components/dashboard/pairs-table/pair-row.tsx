'use client'

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
} from './utils'

interface PairRowProps {
  pair: PairAnalysisResult
  currentPrimaryPair: string
  primaryPrices: number[]
  pairPrices: number[]
  onSelect: () => void
}

/**
 * Table row for displaying a single pair analysis result
 */
export function PairRow({
  pair,
  currentPrimaryPair,
  primaryPrices,
  pairPrices,
  onSelect,
}: PairRowProps) {
  // Calculate recent spread for sparkline (last 40 points)
  let recentSpread: number[] = []
  if (primaryPrices.length > 0 && pairPrices.length > 0) {
    const len = Math.min(primaryPrices.length, pairPrices.length)
    const lookback = 40
    const startIndex = Math.max(0, len - lookback)
    if (len > 0) {
      const pSlice = primaryPrices.slice(startIndex, len)
      const sSlice = pairPrices.slice(startIndex, len)
      recentSpread = calculateSpread(pSlice, sSlice)
    }
  }

  const sparklineColor =
    recentSpread.length > 0 && recentSpread[recentSpread.length - 1] >= recentSpread[0]
      ? '#34d399'
      : '#fb7185'

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      className="border-b transition-colors hover:bg-muted/40 cursor-pointer border-border/50 group relative"
      onClick={onSelect}
    >
      {/* Pair Symbol */}
      <TableCell className="font-medium">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="font-bold text-foreground">{pair.symbol.replace('USDT', '')}</span>
            <span className="text-[10px] text-muted-foreground">
              vs {currentPrimaryPair.replace('USDT', '')}
            </span>
          </div>
        </div>
      </TableCell>

      {/* Correlation */}
      <TableCell>
        <div className="flex flex-col">
          <span className={`font-mono font-medium ${getCorrelationColorClass(pair.correlation)}`}>
            {pair.correlation >= 0 ? '+' : ''}
            {pair.correlation.toFixed(3)}
          </span>
        </div>
      </TableCell>

      {/* Trend Sparkline */}
      <TableCell>
        <div className="w-24 h-8">
          <Sparkline
            data={recentSpread}
            width={96}
            height={32}
            color={sparklineColor}
            fill={true}
          />
        </div>
      </TableCell>

      {/* Spread Z-Score */}
      <TableCell>
        <span className={`font-mono font-bold ${getZScoreColorClass(pair.spreadZScore)}`}>
          {pair.spreadZScore >= 0 ? '+' : ''}
          {pair.spreadZScore.toFixed(2)}σ
        </span>
      </TableCell>

      {/* Signal Quality */}
      <TableCell>
        <Badge
          variant="outline"
          className={`uppercase text-[10px] tracking-wider ${getSignalBadgeClass(
            pair.volatilitySpread.signalQuality
          )}`}
        >
          {getSignalLabel(pair.volatilitySpread.signalQuality).split(' ')[1] ||
            pair.volatilitySpread.signalQuality}
        </Badge>
      </TableCell>

      {/* Regime */}
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {getRegimeLabel(pair.correlationVelocity.regime)}
        </span>
      </TableCell>

      {/* Opportunity Score */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-16 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${getOpportunityScoreBarClass(pair.opportunityScore)}`}
              style={{ width: `${pair.opportunityScore}%` }}
            />
          </div>
          <span
            className={`font-mono text-sm font-bold ${getOpportunityScoreColorClass(
              pair.opportunityScore
            )}`}
          >
            {pair.opportunityScore}
          </span>
        </div>
      </TableCell>

      {/* Actions */}
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
              window.open(
                `https://www.tradingview.com/chart/?symbol=BINANCE:${pair.symbol}`,
                '_blank'
              )
            }}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </motion.tr>
  )
}
