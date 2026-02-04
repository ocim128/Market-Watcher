'use client'

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isBinanceNativeInterval } from '@/lib/binance/resample'

interface TimeframeBadgeProps {
  interval: string
  score: number
  isBest?: boolean
  isWorst?: boolean
}

/**
 * Badge displaying timeframe and its score
 */
export function TimeframeBadge({ interval, score, isBest, isWorst }: TimeframeBadgeProps) {
  const isNative = isBinanceNativeInterval(interval)

  return (
    <div
      className={cn(
        'flex flex-col items-center p-2 rounded-lg border transition-all',
        isBest && 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
        isWorst && 'bg-rose-500/10 border-rose-500/30',
        !isBest && !isWorst && 'bg-muted/30 border-border/50'
      )}
    >
      <div className="flex items-center gap-1">
        <span className="text-xs font-bold text-muted-foreground uppercase">{interval}</span>
        {!isNative && (
          <span title="Resampled from 1m data">
            <Sparkles className="h-3 w-3 text-purple-400" />
          </span>
        )}
      </div>
      <span
        className={cn(
          'text-lg font-bold',
          score >= 70
            ? 'text-emerald-400'
            : score >= 40
              ? 'text-amber-400'
              : 'text-muted-foreground'
        )}
      >
        {score}
      </span>
      {isBest && <span className="text-[10px] text-emerald-400">★ Best</span>}
    </div>
  )
}
