'use client'

import { TrendBadge } from './trend-badge'
import type { useHistory } from '@/hooks/use-history'

interface SummaryStatsProps {
  summary: ReturnType<typeof useHistory>['getSummary']
}

export function SummaryStats({ summary }: SummaryStatsProps) {
  const data = summary()
  if (!data) {
    return null
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="text-xs text-muted-foreground mb-1">Today&apos;s Scans</div>
        <div className="text-3xl font-bold">{data.snapshotsToday}</div>
      </div>
      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="text-xs text-muted-foreground mb-1">Pairs Tracked</div>
        <div className="text-3xl font-bold">{data.uniquePairsTracked}</div>
      </div>
      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="text-xs text-muted-foreground mb-1">Best Today</div>
        <div className="text-lg font-bold text-emerald-400 truncate">
          {data.bestOpportunityToday
            ? `${data.bestOpportunityToday.symbol.replace('USDT', '')} (${data.bestOpportunityToday.score})`
            : '—'}
        </div>
      </div>
      <div className="p-4 bg-muted/30 rounded-lg">
        <div className="text-xs text-muted-foreground mb-1">Market Regime</div>
        <TrendBadge trend={data.marketRegimeTrend} />
      </div>
    </div>
  )
}
