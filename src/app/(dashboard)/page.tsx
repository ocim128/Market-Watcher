import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { OpportunitySummary } from '@/components/dashboard/opportunity-summary'
import { PairsTable } from '@/components/dashboard/pairs-table'
import { BacktestAllPanel } from '@/components/dashboard/backtest-all-panel'
import { QuickAccess } from '@/components/dashboard/quick-access'

export default function Home() {
  return (
    <div className="space-y-6">
      <DashboardHeader />
      <OpportunitySummary />
      <QuickAccess />
      <BacktestAllPanel />
      <PairsTable />
    </div>
  )
}
