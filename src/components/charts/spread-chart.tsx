'use client'

import { useEffect, useRef, useCallback } from 'react'
import { createChart, ColorType, CrosshairMode, LineSeries, LineStyle } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, LineData, Time } from 'lightweight-charts'

interface SpreadChartProps {
  spread: number[]
  mean: number
  std: number
  timestamps?: number[]
  height?: number
}

// Chart configuration constants
const CHART_COLORS = {
  background: 'transparent',
  text: '#9ca3af',
  grid: 'rgba(255, 255, 255, 0.05)',
  crosshair: 'rgba(255, 255, 255, 0.2)',
  upperBand: 'rgba(239, 68, 68, 0.5)',
  lowerBand: 'rgba(34, 197, 94, 0.5)',
  mean: 'rgba(156, 163, 175, 0.5)',
  spread: '#a855f7',
} as const

const BAND_OPTIONS = {
  lineWidth: 1,
  lineStyle: LineStyle.Dashed,
  priceLineVisible: false,
  lastValueVisible: false,
} as const

function createChartOptions(width: number, height: number) {
  return {
    layout: {
      background: { type: ColorType.Solid, color: CHART_COLORS.background },
      textColor: CHART_COLORS.text,
    },
    grid: {
      vertLines: { color: CHART_COLORS.grid },
      horzLines: { color: CHART_COLORS.grid },
    },
    crosshair: {
      mode: CrosshairMode.Magnet,
      vertLine: { color: CHART_COLORS.crosshair },
      horzLine: { color: CHART_COLORS.crosshair },
    },
    width,
    height,
    rightPriceScale: { borderVisible: false },
    timeScale: { borderVisible: false, timeVisible: true },
    handleScale: { mouseWheel: true, pinch: true },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: false,
    },
  }
}

function addChartSeries(chart: IChartApi) {
  const upperBand = chart.addSeries(LineSeries, {
    ...BAND_OPTIONS,
    color: CHART_COLORS.upperBand,
  })

  const lowerBand = chart.addSeries(LineSeries, {
    ...BAND_OPTIONS,
    color: CHART_COLORS.lowerBand,
  })

  const meanSeries = chart.addSeries(LineSeries, {
    ...BAND_OPTIONS,
    color: CHART_COLORS.mean,
    lineStyle: LineStyle.Dotted,
  })

  const spreadSeries = chart.addSeries(LineSeries, {
    color: CHART_COLORS.spread,
    lineWidth: 2,
    priceLineVisible: true,
    lastValueVisible: true,
  })

  return { upperBand, lowerBand, meanSeries, spreadSeries }
}

export function SpreadChart({ spread, mean, std, timestamps, height = 200 }: SpreadChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<{
    spread: ISeriesApi<'Line'> | null
    mean: ISeriesApi<'Line'> | null
    upper: ISeriesApi<'Line'> | null
    lower: ISeriesApi<'Line'> | null
  }>({ spread: null, mean: null, upper: null, lower: null })

  const initChart = useCallback(() => {
    if (!chartContainerRef.current) {
      return
    }

    if (chartRef.current) {
      chartRef.current.remove()
      chartRef.current = null
    }

    const chart = createChart(
      chartContainerRef.current,
      createChartOptions(chartContainerRef.current.clientWidth, height)
    )

    chartRef.current = chart
    const series = addChartSeries(chart)
    seriesRef.current = {
      spread: series.spreadSeries,
      mean: series.meanSeries,
      upper: series.upperBand,
      lower: series.lowerBand,
    }

    return chart
  }, [height])

  // Initialize chart
  useEffect(() => {
    initChart()

    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [initChart])

  // Update data
  useEffect(() => {
    if (!seriesRef.current.spread || !seriesRef.current.mean || spread.length === 0) {
      return
    }

    const now = Date.now()
    const hourMs = 60 * 60 * 1000

    const createLineDataWithTime = (values: number[], constantValue?: number): LineData[] => {
      return values.map((value, i) => ({
        time: (timestamps
          ? timestamps[i] / 1000
          : (now - (values.length - i) * hourMs) / 1000) as Time,
        value: constantValue !== undefined ? constantValue : value,
      }))
    }

    seriesRef.current.spread.setData(createLineDataWithTime(spread))
    seriesRef.current.mean.setData(createLineDataWithTime(spread, mean))
    seriesRef.current.upper?.setData(createLineDataWithTime(spread, mean + 2 * std))
    seriesRef.current.lower?.setData(createLineDataWithTime(spread, mean - 2 * std))
    chartRef.current?.timeScale().fitContent()
  }, [spread, mean, std, timestamps])

  // Handle resize
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

  return <div ref={chartContainerRef} className="w-full" style={{ height }} />
}
