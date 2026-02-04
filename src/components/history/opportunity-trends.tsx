'use client'

import { Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import { TrendBadge } from './trend-badge'
import type { OpportunityTrend } from '@/lib/history/tracking'

interface OpportunityTrendsProps {
  trends: OpportunityTrend[]
  onSelect: (pair: string) => void
}

export function OpportunityTrends({ trends, onSelect }: OpportunityTrendsProps) {
  if (trends.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Opportunity Trends</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {trends.slice(0, 15).map(trend => (
          <motion.div
            key={trend.pair}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-muted/20 rounded-lg border border-border/30 hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => onSelect(trend.pair)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{trend.pair.replace('USDT', '')}</span>
            </div>
            <TrendBadge trend={trend.trend} changePercent={trend.changePercent} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
