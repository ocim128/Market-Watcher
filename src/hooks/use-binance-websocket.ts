'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { config } from '@/config'

export interface WebSocketMessage {
  type: 'ticker' | 'kline' | 'error'
  symbol: string
  data: unknown
}

interface UseBinanceWebSocketOptions {
  symbols: string[]
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  enabled?: boolean
}

const MAX_RECONNECT_ATTEMPTS = 5
const MAX_RECONNECT_DELAY = 30000

function parseWebSocketMessage(payload: {
  stream: string
  data: unknown
}): WebSocketMessage | null {
  try {
    const stream = payload.stream as string
    const data = payload.data as {
      s: string
      c: string
      o: string
      h: string
      l: string
      v: string
      q: string
    }
    const symbol = stream.split('@')[0].toUpperCase()

    return {
      type: 'ticker',
      symbol,
      data: {
        symbol: data.s,
        close: parseFloat(data.c),
        open: parseFloat(data.o),
        high: parseFloat(data.h),
        low: parseFloat(data.l),
        volume: parseFloat(data.v),
        quoteVolume: parseFloat(data.q),
      },
    }
  } catch {
    return null
  }
}

export function useBinanceWebSocket({
  symbols,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  enabled = true,
}: UseBinanceWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)

  const connect = useCallback(() => {
    if (!enabled || symbols.length === 0) {
      return
    }

    const streams = symbols.map(s => `${s.toLowerCase()}@miniTicker`).join('/')
    const wsUrl = `${config.binanceWsUrl}/stream?streams=${streams}`

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.info('[WS] Connected to Binance WebSocket')
        setIsConnected(true)
        reconnectAttempts.current = 0
        onConnect?.()
      }

      ws.onmessage = event => {
        const payload = JSON.parse(event.data)
        const message = parseWebSocketMessage(payload)
        if (message) {
          setLastMessage(message)
          onMessage?.(message)
        }
      }

      ws.onclose = () => {
        console.info('[WS] Disconnected from Binance WebSocket')
        setIsConnected(false)
        onDisconnect?.()

        if (enabled && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), MAX_RECONNECT_DELAY)
          console.info(`[WS] Reconnecting in ${delay}ms...`)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        }
      }

      ws.onerror = error => {
        console.error('[WS] WebSocket error:', error)
        onError?.(error)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('[WS] Failed to create WebSocket:', error)
    }
  }, [enabled, symbols, onMessage, onConnect, onDisconnect, onError])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
  }, [])

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  return { isConnected, lastMessage, connect, disconnect }
}
