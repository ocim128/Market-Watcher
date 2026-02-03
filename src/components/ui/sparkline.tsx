"use client"

import { useMemo } from "react"

interface SparklineProps {
    data: number[]
    width?: number
    height?: number
    color?: string
    strokeWidth?: number
    fill?: boolean
    className?: string
}

export function Sparkline({
    data,
    width = 100,
    height = 30,
    color = "currentColor",
    strokeWidth = 2,
    fill = false,
    className = "",
}: SparklineProps) {
    const { points, areaPoints, isUp } = useMemo(() => {
        if (!data || data.length < 2) return { points: "", areaPoints: "", isUp: true }

        const min = Math.min(...data)
        const max = Math.max(...data)
        const range = max - min || 1 // Avoid division by zero

        // Determine trend
        const isUp = data[data.length - 1] >= data[0]

        // Map data to coordinate system
        const pts = data.map((val, i) => {
            const x = (i / (data.length - 1)) * width
            // Invert Y because SVG origin is top-left
            const normalizedY = (val - min) / range
            const y = height - normalizedY * height
            return `${x},${y}`
        })

        const pointsStr = pts.join(" ")

        // Close the path for fill if needed
        const areaPointsStr = fill
            ? `${pointsStr} ${width},${height} 0,${height}`
            : ""

        return { points: pointsStr, areaPoints: areaPointsStr, isUp }
    }, [data, width, height, fill])

    if (!data || data.length < 2) return null

    // Determine color based on trend if explicitly requested, otherwise use provided color
    // For this generic component, we'll let the parent pass the color class usually, 
    // but default "currentColor" allows parent to style via text-color utility.

    return (
        <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className={`overflow-visible ${className}`}
            preserveAspectRatio="none"
        >
            {/* Gradient definition for fill */}
            <defs>
                <linearGradient id={`spark-gradient-${isUp ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
            </defs>

            {fill && (
                <polygon
                    points={areaPoints}
                    fill={`url(#spark-gradient-${isUp ? 'up' : 'down'})`}
                    stroke="none"
                />
            )}

            <polyline
                points={points}
                fill="none"
                stroke={color === "currentColor" ? "currentColor" : color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Optional: Add a dot at the end */}
            {points && (
                <circle
                    cx={width}
                    cy={parseFloat(points.split(" ").pop()?.split(",")[1] || "0")}
                    r={strokeWidth + 1}
                    fill={color === "currentColor" ? "currentColor" : color}
                />
            )}
        </svg>
    )
}
