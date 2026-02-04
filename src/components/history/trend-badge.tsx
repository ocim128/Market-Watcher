'use client'

import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { OpportunityTrend } from '@/lib/history/tracking'

interface TrendBadgeProps {
  trend: OpportunityTrend['trend']
  changePercent?: number
}

export function TrendBadge({ trend, changePercent }: TrendBadgeProps) {
  const icons = {
    improving: TrendingUp,
    declining: TrendingDown,
    stable: Minus,
    volatile: Activity,
  }

  const colors = {
    improving: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    declining: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    stable: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    volatile: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }

  const Icon = icons[trend]

  return (
    <Badge variant="outline" className={cn('gap-1', colors[trend])}>
      <Icon className="h-3 w-3" />
      <span className="capitalize">{trend}</span>
      {changePercent !== undefined && changePercent !== 0 && (
        <span className="ml-1 text-[10px]">
          ({changePercent > 0 ? '+' : ''}
          {changePercent}%)
        </span>
      )}
    </Badge>
  )
}
