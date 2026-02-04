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

/**
 * Hook for Binance WebSocket connection
 * Streams real-time ticker updates for multiple symbols
 */
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
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (!enabled || symbols.length === 0) {
      return
    }

    // Build stream names for mini ticker
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
        try {
          const payload = JSON.parse(event.data)
          const stream = payload.stream as string
          const data = payload.data

          // Parse stream name to get symbol
          const symbol = stream.split('@')[0].toUpperCase()

          const message: WebSocketMessage = {
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

          setLastMessage(message)
          onMessage?.(message)
        } catch (err) {
          console.error('[WS] Failed to parse message:', err)
        }
      }

      ws.onclose = () => {
        console.info('[WS] Disconnected from Binance WebSocket')
        setIsConnected(false)
        onDisconnect?.()

        // Attempt reconnection
        if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
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

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
  }
}
