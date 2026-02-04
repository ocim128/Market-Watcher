import { Badge } from '@/components/ui/badge'
import type { OptimizedParams } from '@/types/backtest-types'

interface OptimizationBadgeProps {
  optimizedParams: OptimizedParams | null
}

function getClassName(optimizedParams: OptimizedParams | null): string {
  if (!optimizedParams) {
    return 'bg-muted text-muted-foreground border-border'
  }

  if (optimizedParams.improvementPercent > 0) {
    return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  }

  return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
}

function getLabel(optimizedParams: OptimizedParams | null): string {
  if (!optimizedParams) {
    return 'Default Params'
  }

  const delta =
    optimizedParams.improvementPercent >= 0
      ? `+${optimizedParams.improvementPercent.toFixed(2)}%`
      : `${optimizedParams.improvementPercent.toFixed(2)}%`

  return `WF ${optimizedParams.confidence.toUpperCase()} ${delta}`
}

export function OptimizationBadge({ optimizedParams }: OptimizationBadgeProps) {
  return (
    <Badge variant="outline" className={getClassName(optimizedParams)}>
      {getLabel(optimizedParams)}
    </Badge>
  )
}
