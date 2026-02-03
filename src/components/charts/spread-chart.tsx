"use client"

import { useEffect, useRef, useCallback } from "react"
import { createChart, ColorType, CrosshairMode, LineSeries, LineStyle } from "lightweight-charts"
import type { IChartApi, ISeriesApi, LineData, Time } from "lightweight-charts"

interface SpreadChartProps {
    spread: number[]
    mean: number
    std: number
    timestamps?: number[]
    height?: number
}

export function SpreadChart({
    spread,
    mean,
    std,
    timestamps,
    height = 200,
}: SpreadChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const spreadSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
    const meanSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
    const upperBandRef = useRef<ISeriesApi<"Line"> | null>(null)
    const lowerBandRef = useRef<ISeriesApi<"Line"> | null>(null)

    const initChart = useCallback(() => {
        if (!chartContainerRef.current) return

        // Clean up existing chart
        if (chartRef.current) {
            chartRef.current.remove()
            chartRef.current = null
        }

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: "transparent" },
                textColor: "#9ca3af",
            },
            grid: {
                vertLines: { color: "rgba(255, 255, 255, 0.05)" },
                horzLines: { color: "rgba(255, 255, 255, 0.05)" },
            },
            crosshair: {
                mode: CrosshairMode.Magnet,
                vertLine: { color: "rgba(255, 255, 255, 0.2)" },
                horzLine: { color: "rgba(255, 255, 255, 0.2)" },
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
            handleScale: {
                mouseWheel: true,
                pinch: true,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: false,
            },
        })

        chartRef.current = chart

        // Upper band (+2σ)
        upperBandRef.current = chart.addSeries(LineSeries, {
            color: "rgba(239, 68, 68, 0.5)",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
        })

        // Lower band (-2σ)
        lowerBandRef.current = chart.addSeries(LineSeries, {
            color: "rgba(34, 197, 94, 0.5)",
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
        })

        // Mean line
        meanSeriesRef.current = chart.addSeries(LineSeries, {
            color: "rgba(156, 163, 175, 0.5)",
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            priceLineVisible: false,
            lastValueVisible: false,
        })

        // Spread line
        spreadSeriesRef.current = chart.addSeries(LineSeries, {
            color: "#a855f7",
            lineWidth: 2,
            priceLineVisible: true,
            lastValueVisible: true,
        })

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
        if (!spreadSeriesRef.current || !meanSeriesRef.current || spread.length === 0) return

        const now = Date.now()
        const hourMs = 60 * 60 * 1000

        const spreadData: LineData[] = spread.map((value, i) => ({
            time: (timestamps
                ? timestamps[i] / 1000
                : (now - (spread.length - i) * hourMs) / 1000) as Time,
            value,
        }))

        const meanData: LineData[] = spread.map((_, i) => ({
            time: (timestamps
                ? timestamps[i] / 1000
                : (now - (spread.length - i) * hourMs) / 1000) as Time,
            value: mean,
        }))

        const upperData: LineData[] = spread.map((_, i) => ({
            time: (timestamps
                ? timestamps[i] / 1000
                : (now - (spread.length - i) * hourMs) / 1000) as Time,
            value: mean + 2 * std,
        }))

        const lowerData: LineData[] = spread.map((_, i) => ({
            time: (timestamps
                ? timestamps[i] / 1000
                : (now - (spread.length - i) * hourMs) / 1000) as Time,
            value: mean - 2 * std,
        }))

        spreadSeriesRef.current.setData(spreadData)
        meanSeriesRef.current?.setData(meanData)
        upperBandRef.current?.setData(upperData)
        lowerBandRef.current?.setData(lowerData)

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

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    return <div ref={chartContainerRef} className="w-full" style={{ height }} />
}
