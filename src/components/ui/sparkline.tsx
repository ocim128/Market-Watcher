'use client'

import { useMemo } from 'react'

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
  fill?: boolean
  className?: string
}

interface SparklineData {
  points: string
  areaPoints: string
  isUp: boolean
}

function calculateSparklinePoints(
  data: number[],
  width: number,
  height: number
): { points: string; isUp: boolean } {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const isUp = data[data.length - 1] >= data[0]

  const pts = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width
    const normalizedY = (val - min) / range
    const y = height - normalizedY * height
    return `${x},${y}`
  })

  return { points: pts.join(' '), isUp }
}

function calculateAreaPoints(points: string, width: number, height: number, fill: boolean): string {
  return fill ? `${points} ${width},${height} 0,${height}` : ''
}

function processSparklineData(
  data: number[] | undefined,
  width: number,
  height: number,
  fill: boolean
): SparklineData | null {
  if (!data || data.length < 2) {
    return null
  }

  const { points, isUp } = calculateSparklinePoints(data, width, height)
  const areaPoints = calculateAreaPoints(points, width, height, fill)

  return { points, areaPoints, isUp }
}

export function Sparkline({
  data,
  width = 100,
  height = 30,
  color = 'currentColor',
  strokeWidth = 2,
  fill = false,
  className = '',
}: SparklineProps) {
  const sparklineData = useMemo(
    () => processSparklineData(data, width, height, fill),
    [data, width, height, fill]
  )

  if (!sparklineData) {
    return null
  }

  const { points, areaPoints, isUp } = sparklineData
  const lastY = parseFloat(points.split(' ').pop()?.split(',')[1] || '0')
  const gradientId = `spark-gradient-${isUp ? 'up' : 'down'}`
  const strokeColor = color === 'currentColor' ? 'currentColor' : color

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
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {fill && <polygon points={areaPoints} fill={`url(#${gradientId})`} stroke="none" />}

      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Optional: Add a dot at the end */}
      {points && <circle cx={width} cy={lastY} r={strokeWidth + 1} fill={strokeColor} />}
    </svg>
  )
}
