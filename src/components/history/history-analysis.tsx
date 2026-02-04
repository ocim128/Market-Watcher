'use client'

import { useState, useEffect } from 'react'
import { useHistory } from '@/hooks/use-history'
import type { OpportunityTrend } from '@/lib/history/tracking'

import { PageHeader } from './page-header'
import { SummaryStats } from './summary-stats'
import { OpportunityTrends } from './opportunity-trends'
import { BestOpportunities } from './best-opportunities'
import { ActivePairs } from './active-pairs'
import { EmptyState } from './empty-state'

export function HistoryAnalysis() {
  const {
    history,
    getSummary,
    getStats,
    getTrends,
    getBestOpportunities,
    downloadCSV,
    clearAllHistory,
  } = useHistory()

  const [, setSelectedPair] = useState<string | null>(null)
  const [trends, setTrends] = useState<OpportunityTrend[]>([])

  useEffect(() => {
    setTrends(getTrends().slice(0, 15))
  }, [history, getTrends])

  const stats = getStats()

  if (history.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-8">
      <PageHeader stats={getStats} onDownload={downloadCSV} onClear={clearAllHistory} />

      <SummaryStats summary={getSummary} />

      <div className="grid gap-8">
        <OpportunityTrends trends={trends} onSelect={setSelectedPair} />
        <BestOpportunities opportunities={getBestOpportunities} />
        <ActivePairs pairs={stats?.mostActivePairs} onSelect={setSelectedPair} />
      </div>
    </div>
  )
}
