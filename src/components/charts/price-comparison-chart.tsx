'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createChart, ColorType, CrosshairMode, LineSeries } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts'

interface PriceComparisonChartProps {
  primaryPrices: number[]
  secondaryPrices: number[]
  primaryLabel?: string
  secondaryLabel?: string
  timestamps?: number[]
  height?: number
}

/**
 * Normalize prices to percentage change from first value for comparison
 */
function normalizePrices(prices: number[]): number[] {
  if (prices.length === 0) {
    return []
  }
  const first = prices[0]
  if (first === 0) {
    return prices.map(() => 0)
  }
  return prices.map(p => ((p - first) / first) * 100)
}

export function PriceComparisonChart({
  primaryPrices,
  secondaryPrices,
  primaryLabel = 'Primary',
  secondaryLabel = 'Secondary',
  timestamps,
  height = 200,
}: PriceComparisonChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const primarySeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const secondarySeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  const initChart = useCallback(() => {
    if (!chartContainerRef.current) {
      return
    }

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: 'rgba(255, 255, 255, 0.2)' },
        horzLine: { color: 'rgba(255, 255, 255, 0.2)' },
      },
      width: chartContainerRef.current.clientWidth,
      height,
      rightPriceScale: {
        borderVisible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
    })

    chartRef.current = chart

    // Primary pair line (e.g., ETH)
    primarySeriesRef.current = chart.addSeries(LineSeries, {
      color: '#3b82f6', // Blue
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: primaryLabel,
    })

    // Secondary pair line
    secondarySeriesRef.current = chart.addSeries(LineSeries, {
      color: '#f59e0b', // Orange
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      title: secondaryLabel,
    })

    return chart
  }, [height, primaryLabel, secondaryLabel])

  useEffect(() => {
    initChart()

    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [initChart])

  useEffect(() => {
    if (!primarySeriesRef.current || !secondarySeriesRef.current) {
      return
    }
    if (primaryPrices.length === 0 || secondaryPrices.length === 0) {
      return
    }

    const now = Date.now()
    const hourMs = 60 * 60 * 1000

    // Normalize to % change for comparison
    const normalizedPrimary = normalizePrices(primaryPrices)
    const normalizedSecondary = normalizePrices(secondaryPrices)

    const length = Math.min(normalizedPrimary.length, normalizedSecondary.length)

    const primaryData: LineData[] = normalizedPrimary.slice(-length).map((value, i) => ({
      time: (timestamps ? timestamps[i] / 1000 : (now - (length - i) * hourMs) / 1000) as Time,
      value,
    }))

    const secondaryData: LineData[] = normalizedSecondary.slice(-length).map((value, i) => ({
      time: (timestamps ? timestamps[i] / 1000 : (now - (length - i) * hourMs) / 1000) as Time,
      value,
    }))

    primarySeriesRef.current.setData(primaryData)
    secondarySeriesRef.current.setData(secondaryData)

    chartRef.current?.timeScale().fitContent()
  }, [primaryPrices, secondaryPrices, timestamps])

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="relative">
      <div ref={chartContainerRef} className="w-full" style={{ height }} />
      {/* Legend */}
      <div className="absolute left-2 top-2 text-xs flex gap-4">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-blue-500" />
          <span className="text-blue-400">{primaryLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-orange-500" />
          <span className="text-orange-400">{secondaryLabel}</span>
        </div>
      </div>
    </div>
  )
}
