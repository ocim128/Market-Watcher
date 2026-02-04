'use client'

import { TrendingUp, Percent, BarChart3, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useScan } from '@/components/scan-context'

interface SummaryCardProps {
  title: string
  value: string
  description: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
  highlight?: boolean
}

function SummaryCard({
  title,
  value,
  description,
  icon,
  trend,
  loading,
  highlight,
}: SummaryCardProps) {
  const trendColor =
    trend === 'up'
      ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]'
      : trend === 'down'
        ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]'
        : 'text-muted-foreground'

  if (loading) {
    return (
      <Card className="relative overflow-hidden border-white/5 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
          <div className="h-8 w-8 bg-white/10 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-16 bg-white/10 rounded animate-pulse mb-2" />
          <div className="h-3 w-32 bg-white/10 rounded animate-pulse" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 ${
        highlight
          ? 'border-purple-500/30 bg-purple-500/5 ring-1 ring-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]'
          : 'border-white/5 bg-white/5'
      }`}
    >
      <div
        className={`absolute inset-0 pointer-events-none ${
          highlight
            ? 'bg-gradient-to-br from-purple-500/10 via-transparent to-transparent'
            : 'bg-gradient-to-br from-white/5 via-transparent to-transparent'
        }`}
      />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground/80">{title}</CardTitle>
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
            highlight ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-muted-foreground'
          }`}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className={`text-2xl font-bold tracking-tight ${trendColor}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{description}</p>
      </CardContent>
    </Card>
  )
}

export function OpportunitySummary() {
  const { analysisResults, isScanning, isAnalyzing, isComplete } = useScan()

  const isLoading = isScanning || isAnalyzing

  // Calculate summary stats from analysis results
  const stats = useMemo(() => {
    if (!analysisResults || analysisResults.length === 0) {
      return {
        premiumCount: 0,
        strongCorrCount: 0,
        extremeZCount: 0,
        avgOpportunity: 0,
        topOpportunity: null as { symbol: string; score: number } | null,
      }
    }

    const premiumCount = analysisResults.filter(
      r => r.volatilitySpread.signalQuality === 'premium'
    ).length

    const strongCorrCount = analysisResults.filter(r => Math.abs(r.correlation) >= 0.7).length

    const extremeZCount = analysisResults.filter(r => Math.abs(r.spreadZScore) >= 2).length

    const avgOpportunity =
      analysisResults.reduce((sum, r) => sum + r.opportunityScore, 0) / analysisResults.length

    const topResult = analysisResults.reduce((best, r) =>
      r.opportunityScore > (best?.opportunityScore ?? 0) ? r : best
    )

    return {
      premiumCount,
      strongCorrCount,
      extremeZCount,
      avgOpportunity,
      topOpportunity: topResult
        ? { symbol: topResult.symbol, score: topResult.opportunityScore }
        : null,
    }
  }, [analysisResults])

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
    >
      <motion.div variants={item}>
        <SummaryCard
          title="Premium Signals"
          value={isLoading ? '...' : stats.premiumCount.toString()}
          description="High spread, low volatility opportunities"
          icon={<Sparkles className="h-4 w-4" />}
          trend={stats.premiumCount > 0 ? 'up' : 'neutral'}
          loading={isLoading}
          highlight={stats.premiumCount > 0}
        />
      </motion.div>
      <motion.div variants={item}>
        <SummaryCard
          title="Strong Correlations"
          value={isLoading ? '...' : stats.strongCorrCount.toString()}
          description="Pairs with correlation > 0.7"
          icon={<TrendingUp className="h-4 w-4" />}
          trend={stats.strongCorrCount > 0 ? 'up' : 'neutral'}
          loading={isLoading}
        />
      </motion.div>
      <motion.div variants={item}>
        <SummaryCard
          title="Extreme Z-Scores"
          value={isLoading ? '...' : stats.extremeZCount.toString()}
          description="Spread divergence > 2σ"
          icon={<BarChart3 className="h-4 w-4" />}
          trend={stats.extremeZCount > 0 ? 'up' : 'neutral'}
          loading={isLoading}
        />
      </motion.div>
      <motion.div variants={item}>
        <SummaryCard
          title="Avg Opportunity"
          value={
            isLoading
              ? '...'
              : isComplete && analysisResults.length > 0
                ? `${stats.avgOpportunity.toFixed(0)}%`
                : '--'
          }
          description={
            stats.topOpportunity
              ? `Top: ${stats.topOpportunity.symbol.replace('USDT', '')} (${stats.topOpportunity.score}%)`
              : 'Mean score across all pairs'
          }
          icon={<Percent className="h-4 w-4" />}
          trend={stats.avgOpportunity >= 40 ? 'up' : 'neutral'}
          loading={isLoading}
        />
      </motion.div>
    </motion.div>
  )
}
