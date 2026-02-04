'use client'

import { BarChart } from 'lucide-react'
import { config } from '@/config'

interface EmptyStateProps {
  currentPrimaryPair: string
}

/**
 * Empty state when no scan has been run yet
 */
export function EmptyState({ currentPrimaryPair }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-4 ring-1 ring-primary/20">
        <BarChart className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-semibold text-lg mb-2">Ready to Scan</h3>
      <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-6">
        Click &quot;Scan Pairs&quot; to analyze correlations between{' '}
        <span className="text-foreground font-mono">{currentPrimaryPair}</span> and the top{' '}
        {config.topPairsLimit} USDT pairs.
      </p>
    </div>
  )
}
