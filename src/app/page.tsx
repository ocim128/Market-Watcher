import { Header } from '@/components/dashboard/header'
import { OpportunitySummary } from '@/components/dashboard/opportunity-summary'
import { PairsTable } from '@/components/dashboard/pairs-table'
import { BacktestAllPanel } from '@/components/dashboard/backtest-all-panel'
import { MultiTimeframePanel } from '@/components/dashboard/multi-timeframe-panel'
import { HistoryPanel } from '@/components/dashboard/history-panel'

export default function Home() {
  return (
    <main className="container mx-auto py-6 px-4 space-y-6">
      <Header />
      <OpportunitySummary />
      <BacktestAllPanel />
      <PairsTable />
      <MultiTimeframePanel />
      <HistoryPanel />
    </main>
  )
}
