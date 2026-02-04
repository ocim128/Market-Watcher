import { Layers } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/20 w-fit mx-auto mb-4">
        <Layers className="h-8 w-8 text-purple-400" />
      </div>
      <p className="text-lg font-medium">Ready to analyze</p>
      <p className="text-sm mt-1 max-w-md mx-auto">
        Configure your settings below and run a scan to find multi-timeframe confluence signals
      </p>
    </div>
  )
}

export function NoResultsState() {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <p className="text-lg font-medium">No signals found</p>
      <p className="text-sm mt-1">Try adjusting your settings or running the scan again</p>
    </div>
  )
}
