import { Header } from "@/components/dashboard/header"
import { OpportunitySummary } from "@/components/dashboard/opportunity-summary"
import { PairsTable } from "@/components/dashboard/pairs-table"

export default function Home() {
    return (
        <main className="container mx-auto py-6 px-4 space-y-6">
            <Header />
            <OpportunitySummary />
            <PairsTable />
        </main>
    )
}
