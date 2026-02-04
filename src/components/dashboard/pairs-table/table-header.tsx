'use client'

import { ArrowUpDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableHead, TableHeader as UITableHeader, TableRow } from '@/components/ui/table'
import type { SortKey, SortConfig } from './use-table-sorting'

interface TableHeaderProps {
  _sortConfig: SortConfig
  onSort: (key: SortKey) => void
}

interface SortableHeaderProps {
  label: string
  sortKey: SortKey
  onSort: (key: SortKey) => void
  className?: string
}

function SortableHeader({ label, sortKey, onSort, className = '' }: SortableHeaderProps) {
  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 gap-1 font-semibold"
        onClick={() => onSort(sortKey)}
      >
        {label}
        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </TableHead>
  )
}

function TrendHeader() {
  return (
    <TableHead className="w-[120px]">
      <div className="flex items-center gap-1 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
        <TrendingUp className="h-3 w-3" />
        Trend (40h)
      </div>
    </TableHead>
  )
}

export function TableHeader({ _sortConfig, onSort }: TableHeaderProps) {
  return (
    <UITableHeader className="bg-muted/30">
      <TableRow className="hover:bg-transparent border-border/50">
        <SortableHeader label="Pair" sortKey="symbol" onSort={onSort} className="w-[140px]" />
        <SortableHeader label="Correlation" sortKey="correlation" onSort={onSort} />
        <TrendHeader />
        <SortableHeader label="Spread Z" sortKey="spreadZScore" onSort={onSort} />
        <SortableHeader label="Signal" sortKey="signalQuality" onSort={onSort} />
        <TableHead className="font-semibold">Regime</TableHead>
        <SortableHeader label="Confluence" sortKey="confluence" onSort={onSort} />
        <SortableHeader label="Opp. Score" sortKey="opportunityScore" onSort={onSort} />
        <TableHead className="w-[100px]" />
      </TableRow>
    </UITableHeader>
  )
}
