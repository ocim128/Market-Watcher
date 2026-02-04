'use client'

import { TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ActivePairsProps {
  pairs: string[] | undefined
  onSelect: (pair: string) => void
}

export function ActivePairs({ pairs, onSelect }: ActivePairsProps) {
  if (!pairs || pairs.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Most Active Pairs</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {pairs.map(pair => (
          <Badge
            key={pair}
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 px-3 py-1 text-sm"
            onClick={() => onSelect(pair)}
          >
            {pair.replace('USDT', '')}
          </Badge>
        ))}
      </div>
    </div>
  )
}
