'use client'

import Link from 'next/link'
import { History, Download, Trash2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { useHistory } from '@/hooks/use-history'

interface PageHeaderProps {
  stats: ReturnType<typeof useHistory>['getStats']
  onDownload: () => void
  onClear: () => void
}

export function PageHeader({ stats, onDownload, onClear }: PageHeaderProps) {
  const statsData = stats()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <History className="h-6 w-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Historical Tracking</h1>
          <p className="text-sm text-muted-foreground">
            {statsData?.totalSnapshots} snapshots from{' '}
            {statsData?.dateRange.start
              ? new Date(statsData.dateRange.start).toLocaleDateString()
              : 'N/A'}{' '}
            -{' '}
            {statsData?.dateRange.end
              ? new Date(statsData.dateRange.end).toLocaleDateString()
              : 'N/A'}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onDownload} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button
          variant="outline"
          onClick={onClear}
          className="gap-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
        >
          <Trash2 className="h-4 w-4" />
          Clear History
        </Button>
      </div>
    </div>
  )
}
