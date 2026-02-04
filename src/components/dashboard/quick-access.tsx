'use client'

import Link from 'next/link'
import { Layers, History, ArrowRight, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

import { cn } from '@/lib/utils'

interface QuickAccessCardProps {
  title: string
  description: string
  href: string
  icon: React.ElementType
  color: 'purple' | 'blue' | 'emerald' | 'amber'
  stats?: string
}

function QuickAccessCard({
  title,
  description,
  href,
  icon: Icon,
  color,
  stats,
}: QuickAccessCardProps) {
  const colorClasses = {
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20',
  }

  return (
    <Link href={href} className="block">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className={cn(
            'border-border/40 bg-card/50 backdrop-blur-sm transition-colors',
            'hover:border-primary/30 group cursor-pointer h-full'
          )}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className={cn('p-2.5 rounded-lg border transition-colors', colorClasses[color])}>
                <Icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
            <CardTitle className="text-lg mt-3">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </CardHeader>
          {stats && (
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{stats}</span>
              </div>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </Link>
  )
}

export function QuickAccess() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <QuickAccessCard
        title="Multi-Timeframe Confluence"
        description="Analyze correlations across multiple timeframes for high-confidence signals"
        href="/mtf"
        icon={Layers}
        color="purple"
        stats="Custom intervals supported"
      />
      <QuickAccessCard
        title="Historical Tracking"
        description="View opportunity trends, track performance, and export historical data"
        href="/history"
        icon={History}
        color="blue"
        stats="30-day retention"
      />
    </div>
  )
}
