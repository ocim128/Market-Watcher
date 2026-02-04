'use client'

import { Loader2 } from 'lucide-react'
import { CardHeader as UICardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { ScanProgress } from '@/types'
import type { PairsTableStats } from './use-pairs-table-stats'
import { formatLastScanTime } from './utils'

interface PairsTableCardHeaderProps {
  currentPrimaryPair: string
  isScanning: boolean
  isAnalyzing: boolean
  isComplete: boolean
  lastScanTime: Date | null
  progress: ScanProgress
  stats: PairsTableStats
}

/**
 * Header section of the pairs table card
 */
export function PairsTableCardHeader({
  currentPrimaryPair,
  isScanning,
  isAnalyzing,
  isComplete,
  lastScanTime,
  progress,
  stats,
}: PairsTableCardHeaderProps) {
  return (
    <UICardHeader>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            Pair Analysis
            {(isScanning || isAnalyzing) && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </CardTitle>
          <CardDescription>
            {currentPrimaryPair} vs Top USDT Pairs • Last scan: {formatLastScanTime(lastScanTime)}
            {isComplete && stats.total > 0 && (
              <span>
                {' '}
                • Showing {stats.filtered} of {stats.total} pairs
                {stats.premium > 0 && (
                  <span className="text-emerald-400 ml-1 font-medium">
                    ({stats.premium} premium)
                  </span>
                )}
              </span>
            )}
          </CardDescription>
        </div>
      </div>

      {/* Progress bar during scanning */}
      {isScanning && progress.total > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Fetching {progress.currentSymbol}...
            </span>
            <span className="font-mono text-xs">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Analysis indicator */}
      {isAnalyzing && (
        <div className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
          <span className="animate-pulse">Running advanced statistical analysis...</span>
        </div>
      )}
    </UICardHeader>
  )
}
