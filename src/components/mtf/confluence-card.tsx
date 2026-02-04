'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ConfluenceResult } from '@/types'
import { CONFIDENCE_COLORS, CONFIDENCE_EMOJI } from './constants'
import { TimeframeBadge } from './timeframe-badge'

interface ConfluenceCardProps {
  result: ConfluenceResult
  index: number
}

function useDataQualityCheck(result: ConfluenceResult) {
  const opportunityScores = result.timeframeAnalyses.map(ta => ta.result.opportunityScore)
  const allScoresIdentical = new Set(opportunityScores).size === 1 && opportunityScores.length > 2
  return allScoresIdentical || result.notes.some(n => n.includes('⚠️ Data quality'))
}

function getCardClasses(confidence: string, hasIssue: boolean) {
  return cn(
    'border-border/40 bg-card/50 backdrop-blur-sm transition-all cursor-pointer hover:border-primary/30',
    confidence === 'high' && !hasIssue && 'border-emerald-500/20',
    confidence === 'medium' && !hasIssue && 'border-amber-500/20',
    hasIssue && 'border-rose-500/30 bg-rose-500/5'
  )
}

function DataQualityBanner() {
  return (
    <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-2">
      <span className="text-rose-400 text-xs font-medium">
        ⚠️ Data Quality Issue - All intervals show identical scores
      </span>
    </div>
  )
}

interface CardHeaderProps {
  result: ConfluenceResult
  onClick: () => void
}

function CardHeaderContent({ result, onClick }: CardHeaderProps) {
  return (
    <CardHeader className="pb-3" onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <CardTitle className="text-lg">
              {result.symbol.replace('USDT', '')}
              <span className="text-muted-foreground text-sm ml-2">
                vs {result.primarySymbol.replace('USDT', '')}
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              {result.alignedTimeframes}/{result.totalTimeframes} timeframes aligned
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={cn(
              'uppercase text-[10px] tracking-wider',
              CONFIDENCE_COLORS[result.confidence]
            )}
          >
            {CONFIDENCE_EMOJI[result.confidence]} {result.confidence}
          </Badge>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{result.confluenceScore}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Confluence
            </div>
          </div>
        </div>
      </div>
    </CardHeader>
  )
}

function TimeframeScores({ result }: { result: ConfluenceResult }) {
  return (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
      {result.timeframeAnalyses.map(ta => (
        <TimeframeBadge
          key={ta.interval}
          interval={ta.interval}
          score={ta.result.opportunityScore}
          isBest={ta.interval === result.bestTimeframe}
          isWorst={ta.interval === result.worstTimeframe}
        />
      ))}
    </div>
  )
}

function SignalDirection({ result }: { result: ConfluenceResult }) {
  if (result.signalDirection === 'neutral') {
    return null
  }

  const isLong = result.signalDirection === 'long_spread'

  return (
    <div className="flex items-center gap-2 mb-3 p-2 bg-primary/5 rounded-lg border border-primary/10">
      <Target className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium">
        Signal:{' '}
        <span className={isLong ? 'text-emerald-400' : 'text-rose-400'}>
          {isLong ? 'LONG Spread' : 'SHORT Spread'}
        </span>
      </span>
      <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
      <span className="text-xs text-muted-foreground">
        {isLong ? 'Buy Primary / Sell Secondary' : 'Sell Primary / Buy Secondary'}
      </span>
    </div>
  )
}

function AgreementMetrics({ result }: { result: ConfluenceResult }) {
  const metrics = [
    { label: 'Z-Score', value: result.zScoreAgreement },
    { label: 'Correlation', value: result.correlationAgreement },
    { label: 'Quality', value: result.qualityAgreement },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 text-center mb-3">
      {metrics.map(metric => (
        <div key={metric.label} className="p-2 bg-muted/30 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">{metric.label}</div>
          <div
            className={cn(
              'text-sm font-bold',
              metric.value > 0.7
                ? 'text-emerald-400'
                : metric.value > 0.4
                  ? 'text-amber-400'
                  : 'text-rose-400'
            )}
          >
            {Math.round(metric.value * 100)}%
          </div>
        </div>
      ))}
    </div>
  )
}

function ExpandedNotes({ notes }: { notes: string[] }) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div className="pt-3 border-t border-border/50 space-y-1">
        {notes.map((note, i) => (
          <div key={i} className="text-xs text-muted-foreground flex items-start gap-2">
            <span>{note}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

function ExpandHint({ expanded }: { expanded: boolean }) {
  return (
    <div className="text-center mt-2">
      <span className="text-[10px] text-muted-foreground">
        {expanded ? 'Click to collapse' : 'Click to expand details'}
      </span>
    </div>
  )
}

export function ConfluenceCard({ result, index }: ConfluenceCardProps) {
  const [expanded, setExpanded] = useState(false)
  const hasDataQualityIssue = useDataQualityCheck(result)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className={getCardClasses(result.confidence, hasDataQualityIssue)}>
        {hasDataQualityIssue && <DataQualityBanner />}
        <CardHeaderContent result={result} onClick={() => setExpanded(!expanded)} />

        <CardContent className="pt-0">
          <TimeframeScores result={result} />
          <SignalDirection result={result} />
          <AgreementMetrics result={result} />
          <AnimatePresence>{expanded && <ExpandedNotes notes={result.notes} />}</AnimatePresence>
          <ExpandHint expanded={expanded} />
        </CardContent>
      </Card>
    </motion.div>
  )
}
