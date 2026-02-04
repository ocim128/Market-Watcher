import { MainNav } from '@/components/navigation/main-nav'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Navigation Sidebar */}
      <MainNav />

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 min-w-0',
          'pt-16 md:pt-0', // Mobile: account for fixed header, Desktop: no top padding
          'px-4 py-6 md:px-6 md:py-8'
        )}
      >
        <div className="mx-auto max-w-7xl space-y-6">{children}</div>
      </main>
    </div>
  )
}
