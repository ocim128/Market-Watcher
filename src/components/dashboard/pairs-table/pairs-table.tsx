'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody } from '@/components/ui/table'
import { AnimatePresence } from 'framer-motion'
import { useScan } from '@/features/scan'
import { FilterControls } from '../filter-controls'
import { PairDetailModal } from '../pair-detail-modal'
import type { PairAnalysisResult } from '@/types'

import { PairsTableCardHeader } from './card-header'
import { TableHeader } from './table-header'
import { PairRow } from './pair-row'
import { EmptyState } from './empty-state'
import { NoResultsState } from './no-results-state'
import { useTableFilters } from './use-table-filters'
import { useTableSorting } from './use-table-sorting'
import { usePairsTableStats } from './use-pairs-table-stats'

/**
 * Pairs Table Component
 *
 * Displays analyzed trading pairs with filtering, sorting, and detail view.
 * Refactored into smaller, focused components for maintainability.
 */
export function PairsTable() {
  // Get scan state
  const {
    analysisResults,
    results,
    isScanning,
    isAnalyzing,
    isComplete,
    progress,
    lastScanTime,
    currentPrimaryPair,
    currentExchange,
  } = useScan()

  // Local state for selected pair
  const [selectedPair, setSelectedPair] = useState<PairAnalysisResult | null>(null)

  // Create price map for sparkline data
  const priceMap = useMemo(() => {
    const map = new Map<string, number[]>()
    results.forEach(r => map.set(r.symbol, r.closePrices))
    return map
  }, [results])

  // Table state management
  const { filters, setFilters, searchQuery, setSearchQuery, filteredData, resetFilters } =
    useTableFilters(analysisResults)

  const { sortConfig, sortedData, handleSort } = useTableSorting(filteredData)

  const stats = usePairsTableStats(analysisResults, filteredData)

  // Get primary pair prices for sparkline calculations
  const primaryPrices = priceMap.get(currentPrimaryPair) || []

  return (
    <>
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <PairsTableCardHeader
          currentPrimaryPair={currentPrimaryPair}
          isScanning={isScanning}
          isAnalyzing={isAnalyzing}
          isComplete={isComplete}
          lastScanTime={lastScanTime}
          progress={progress}
          stats={stats}
        />

        {/* Filter controls */}
        {analysisResults.length > 0 && (
          <div className="px-6 pb-4">
            <FilterControls
              filters={filters}
              onFiltersChange={setFilters}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>
        )}

        <CardContent>
          {sortedData.length > 0 ? (
            <div className="rounded-md border border-border/50">
              <Table>
                <TableHeader _sortConfig={sortConfig} onSort={handleSort} />
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {sortedData.map(pair => (
                      <PairRow
                        key={pair.symbol}
                        pair={pair}
                        currentExchange={currentExchange}
                        currentPrimaryPair={currentPrimaryPair}
                        primaryPrices={primaryPrices}
                        pairPrices={priceMap.get(pair.symbol) || []}
                        onSelect={() => setSelectedPair(pair)}
                      />
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          ) : analysisResults.length > 0 ? (
            <NoResultsState onClearFilters={resetFilters} />
          ) : (
            <EmptyState currentPrimaryPair={currentPrimaryPair} />
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedPair && (
        <PairDetailModal pair={selectedPair} onClose={() => setSelectedPair(null)} />
      )}
    </>
  )
}
