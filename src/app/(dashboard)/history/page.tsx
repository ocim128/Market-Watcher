import type { Metadata } from 'next'
import { HistoryAnalysis } from '@/components/history'

export const metadata: Metadata = {
  title: 'Historical Tracking | Market Watcher',
  description: 'Track pair trading opportunities and performance over time',
}

export default function HistoryPage() {
  return <HistoryAnalysis />
}
