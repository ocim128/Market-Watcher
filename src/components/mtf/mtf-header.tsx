import Link from 'next/link'
import { ArrowLeft, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ConfluenceResult } from '@/types'
import type { ScanMode } from '@/config'

export function MtfHeader({
  currentPrimaryPair,
  currentScanMode,
  resultsCount,
}: {
  currentPrimaryPair: string
  currentScanMode: ScanMode
  resultsCount: number
}) {
  const scanDescription =
    currentScanMode === 'all_vs_all'
      ? 'Analyze all-pairs correlations across multiple timeframes'
      : `Analyze ${currentPrimaryPair.replace('USDT', '')} correlations across multiple timeframes`

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <Layers className="h-6 w-6 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Multi-Timeframe Confluence</h1>
          <p className="text-sm text-muted-foreground">{scanDescription}</p>
        </div>
      </div>
      {resultsCount > 0 && (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 w-fit">
          {resultsCount} signals found
        </Badge>
      )}
    </div>
  )
}

export function ResultsSummary({ results }: { results: ConfluenceResult[] }) {
  const highConfidence = results.filter(r => r.confidence === 'high').length
  const withSignal = results.filter(r => r.signalDirection !== 'neutral').length

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <span>
        <strong className="text-foreground">{results.length}</strong> pairs analyzed
      </span>
      {highConfidence > 0 && (
        <span className="text-emerald-400">
          <strong>{highConfidence}</strong> high confidence
        </span>
      )}
      {withSignal > 0 && (
        <span className="text-primary">
          <strong>{withSignal}</strong> with signal
        </span>
      )}
    </div>
  )
}
