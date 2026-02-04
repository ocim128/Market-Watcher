'use client'

import { ArrowUpDown, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableHead, TableHeader as UITableHeader, TableRow } from '@/components/ui/table'
import type { SortKey, SortConfig } from './use-table-sorting'

interface TableHeaderProps {
  _sortConfig: SortConfig
  onSort: (key: SortKey) => void
}

/**
 * Table header with sortable columns
 */
export function TableHeader({ _sortConfig, onSort }: TableHeaderProps) {
  return (
    <UITableHeader className="bg-muted/30">
      <TableRow className="hover:bg-transparent border-border/50">
        <TableHead className="w-[140px]">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1 font-semibold"
            onClick={() => onSort('symbol')}
          >
            Pair
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </TableHead>

        <TableHead>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1 font-semibold"
            onClick={() => onSort('correlation')}
          >
            Correlation
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </TableHead>

        <TableHead className="w-[120px]">
          <div className="flex items-center gap-1 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
            <TrendingUp className="h-3 w-3" />
            Trend (40h)
          </div>
        </TableHead>

        <TableHead>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1 font-semibold"
            onClick={() => onSort('spreadZScore')}
          >
            Spread Z
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </TableHead>

        <TableHead>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1 font-semibold"
            onClick={() => onSort('signalQuality')}
          >
            Signal
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </TableHead>

        <TableHead className="font-semibold">Regime</TableHead>

        <TableHead>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1 font-semibold"
            onClick={() => onSort('opportunityScore')}
          >
            Opp. Score
            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </TableHead>

        <TableHead className="w-[100px]"></TableHead>
      </TableRow>
    </UITableHeader>
  )
}
