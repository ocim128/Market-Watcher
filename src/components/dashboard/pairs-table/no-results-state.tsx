'use client'

import { BarChart } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NoResultsStateProps {
  onClearFilters: () => void
}

/**
 * State shown when filters return no results
 */
export function NoResultsState({ onClearFilters }: NoResultsStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted/30 p-4 mb-4">
        <BarChart className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-lg mb-2">No Matching Pairs</h3>
      <p className="text-muted-foreground text-sm max-w-sm mx-auto">
        No pairs match your current filters. Try relaxing the correlation or signal quality
        criteria.
      </p>
      <Button variant="link" onClick={onClearFilters} className="mt-4 text-primary">
        Clear all filters
      </Button>
    </div>
  )
}
