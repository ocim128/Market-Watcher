'use client'

import { BarChart3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { useHistory } from '@/hooks/use-history'

interface BestOpportunitiesProps {
  opportunities: ReturnType<typeof useHistory>['getBestOpportunities']
}

export function BestOpportunities({ opportunities }: BestOpportunitiesProps) {
  const opps = opportunities(15)

  if (opps.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Top Historical Opportunities</h3>
      </div>
      <div className="grid gap-3">
        {opps.map((opp, i) => (
          <div
            key={opp.symbol}
            className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border/30"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground w-6">#{i + 1}</span>
              <span className="font-medium">{opp.symbol.replace('USDT', '')}</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm text-muted-foreground">{opp.occurrences} occurrences</span>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400">
                Avg: {opp.avgScore}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
