'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SignalHistoryRecord } from '@/lib/scanner'

interface SignalHistoryProps {
  records: SignalHistoryRecord[]
  onClear: () => void
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function computeStats(records: SignalHistoryRecord[]): {
  total: number
  open: number
  wins: number
  losses: number
  winRate: number
} {
  const open = records.filter(record => record.outcome === 'open').length
  const resolved = records.filter(record => record.outcome !== 'open')
  const wins = resolved.filter(record => record.outcome === 'tp').length
  const losses = resolved.filter(record => record.outcome === 'timeout').length

  return {
    total: records.length,
    open,
    wins,
    losses,
    winRate: resolved.length > 0 ? (wins / resolved.length) * 100 : 0,
  }
}

export function SignalHistory({ records, onClear }: SignalHistoryProps) {
  const stats = computeStats(records)

  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Signal History</CardTitle>
          <CardDescription>
            {stats.total} signals, {stats.wins} wins, {stats.losses} timeouts, {stats.open} open
            {' · '}Win Rate {stats.winRate.toFixed(1)}%
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear
        </Button>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No signal history yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>RSI</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>PnL</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.slice(0, 50).map(record => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.symbol}</TableCell>
                  <TableCell>{formatDate(record.timestamp)}</TableCell>
                  <TableCell>{record.rsi.toFixed(2)}</TableCell>
                  <TableCell>{record.rating}</TableCell>
                  <TableCell className="uppercase">{record.outcome.replace('_', ' ')}</TableCell>
                  <TableCell
                    className={record.pnlPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                  >
                    {formatPercent(record.pnlPercent)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
