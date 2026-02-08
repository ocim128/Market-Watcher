'use client'

import { useMemo } from 'react'
import { RefreshCw, XCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MockTradeRecord } from '@/lib/history/mock-trades'

interface MockTradesPanelProps {
  trades: MockTradeRecord[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  onRefresh: () => Promise<void>
  onCloseTrade: (tradeId: string) => Promise<void>
  onClearAll: () => void
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

function getPnlClass(value: number): string {
  if (value > 0) {
    return 'text-emerald-400'
  }
  if (value < 0) {
    return 'text-rose-400'
  }
  return 'text-muted-foreground'
}

function DirectionBadge({ trade }: { trade: MockTradeRecord }) {
  return (
    <Badge
      variant="outline"
      className={
        trade.entry.direction === 'long_spread'
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      }
    >
      LONG {trade.entry.longSymbol.replace('USDT', '')} / SHORT{' '}
      {trade.entry.shortSymbol.replace('USDT', '')}
    </Badge>
  )
}

function EntryMetadata({ trade }: { trade: MockTradeRecord }) {
  const barsByInterval = Object.entries(trade.entry.barsLoadedByInterval)
    .map(([interval, bars]) => `${interval}:${bars}`)
    .join(' ')

  return (
    <div className="text-xs text-muted-foreground space-y-1">
      <div>
        Entry: {trade.entry.primarySymbol.replace('USDT', '')} vs{' '}
        {trade.entry.secondarySymbol.replace('USDT', '')}
      </div>
      <div>
        Confluence: {trade.entry.confluenceScore} | Confidence: {trade.entry.confidence} | Aligned:{' '}
        {trade.entry.alignedTimeframes}/{trade.entry.totalTimeframes}
      </div>
      <div>
        Bars Loaded: avg {trade.entry.averageBarsLoaded}
        {trade.entry.configuredBars ? ` (configured ${trade.entry.configuredBars})` : ''}
      </div>
      <div className="font-mono">{barsByInterval}</div>
    </div>
  )
}

function TradeRow({
  trade,
  isRefreshing,
  onCloseTrade,
}: {
  trade: MockTradeRecord
  isRefreshing: boolean
  onCloseTrade: (tradeId: string) => Promise<void>
}) {
  const mark = trade.status === 'closed' ? trade.exit : trade.latestMark
  const combined = mark?.combinedPercent ?? 0
  const markLabel = trade.status === 'closed' ? 'Realized' : 'Unrealized'
  const checkedAt = trade.status === 'closed' ? trade.exit?.closedAt : trade.latestMark?.checkedAt

  return (
    <div className="rounded-lg border border-border/40 bg-secondary/20 p-3 space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <DirectionBadge trade={trade} />
          <Badge variant="outline" className={trade.status === 'open' ? '' : 'bg-muted/40'}>
            {trade.status.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{markLabel} P/L</span>
          <span className={`font-mono font-bold ${getPnlClass(combined)}`}>
            {formatPercent(combined)}
          </span>
          {trade.status === 'open' && (
            <Button
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              onClick={() => void onCloseTrade(trade.id)}
              className="h-7 gap-1"
            >
              <XCircle className="h-3.5 w-3.5" />
              Close
            </Button>
          )}
        </div>
      </div>

      <EntryMetadata trade={trade} />

      <div className="text-xs text-muted-foreground">
        Opened: {formatDate(trade.createdAt)}
        {checkedAt ? ` | Last Check: ${formatDate(checkedAt)}` : ''}
      </div>
    </div>
  )
}

export function MockTradesPanel({
  trades,
  isLoading,
  isRefreshing,
  error,
  onRefresh,
  onCloseTrade,
  onClearAll,
}: MockTradesPanelProps) {
  const { openTrades, closedTrades } = useMemo(() => {
    const open = trades.filter(trade => trade.status === 'open')
    const closed = trades.filter(trade => trade.status === 'closed')
    return { openTrades: open, closedTrades: closed }
  }, [trades])

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Mock Trade Tracker</CardTitle>
            <CardDescription>
              Open {openTrades.length} | Closed {closedTrades.length}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || isRefreshing}
              className="gap-1"
              onClick={() => void onRefresh()}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh P/L
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={trades.length === 0}
              className="gap-1 text-rose-400 hover:text-rose-300"
              onClick={onClearAll}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>
          </div>
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        {trades.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No mock trades yet. Use the "Mock Trade" button on a confluence card.
          </p>
        )}

        {openTrades.map(trade => (
          <TradeRow
            key={trade.id}
            trade={trade}
            isRefreshing={isRefreshing}
            onCloseTrade={onCloseTrade}
          />
        ))}

        {closedTrades.slice(0, 20).map(trade => (
          <TradeRow
            key={trade.id}
            trade={trade}
            isRefreshing={isRefreshing}
            onCloseTrade={onCloseTrade}
          />
        ))}
      </CardContent>
    </Card>
  )
}
