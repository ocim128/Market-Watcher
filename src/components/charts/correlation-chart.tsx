"use client"

import { useEffect, useRef, useCallback } from "react"
import { createChart, ColorType, CrosshairMode, LineSeries } from "lightweight-charts"
import type { IChartApi, ISeriesApi, LineData, Time } from "lightweight-charts"

interface CorrelationChartProps {
    correlations: number[]
    timestamps?: number[]
    height?: number
    thresholds?: {
        strong: number
        weak: number
    }
}

export function CorrelationChart({
    correlations,
    timestamps,
    height = 150,
    thresholds = { strong: 0.7, weak: 0.3 },
}: CorrelationChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const seriesRef = useRef<ISeriesApi<"Line"> | null>(null)

    const initChart = useCallback(() => {
        if (!chartContainerRef.current) return

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
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1,
                },
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
            },
        })

        chartRef.current = chart

        // Main correlation line
        seriesRef.current = chart.addSeries(LineSeries, {
            color: "#22c55e",
            lineWidth: 2,
            priceLineVisible: true,
            lastValueVisible: true,
        })

        // Add horizontal lines for thresholds
        chart.applyOptions({
            rightPriceScale: {
                autoScale: true,
            },
        })

        return chart
    }, [height])

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
        if (!seriesRef.current || correlations.length === 0) return

        const now = Date.now()
        const hourMs = 60 * 60 * 1000

        const data: LineData[] = correlations.map((value, i) => ({
            time: (timestamps
                ? timestamps[i] / 1000
                : (now - (correlations.length - i) * hourMs) / 1000) as Time,
            value,
        }))

        seriesRef.current.setData(data)
        chartRef.current?.timeScale().fitContent()
    }, [correlations, timestamps])

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

    return (
        <div className="relative">
            <div ref={chartContainerRef} className="w-full" style={{ height }} />
            {/* Threshold labels */}
            <div className="absolute right-2 top-2 text-xs text-muted-foreground">
                <div className="text-emerald-500">Strong &gt; {thresholds.strong}</div>
                <div className="text-yellow-500">Weak &lt; {thresholds.weak}</div>
            </div>
        </div>
    )
}
