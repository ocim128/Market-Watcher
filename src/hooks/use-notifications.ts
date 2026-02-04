'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PairAnalysisResult } from '@/types'

interface UseNotificationsOptions {
  enabled?: boolean
  soundEnabled?: boolean
}

/**
 * Hook for browser notifications when premium signals are detected
 */
export function useNotifications({
  enabled = true,
  soundEnabled = true,
}: UseNotificationsOptions = {}) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [isSoundEnabled, setIsSoundEnabled] = useState(soundEnabled)
  const lastNotifiedRef = useRef<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return false
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }, [])

  // Check permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // Create audio element for notification sound
  useEffect(() => {
    // Using a simple beep sound (base64 encoded)
    audioRef.current = new Audio(
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVYvMGqe1/CjYiMyThyHvF5hgWcsXoV3fXN2dnOAgHt0cmNqaGlxfHl6gIB8fHx4foGCgHx6fHx+goKBf4CAgIGCgoKCgYGBgYGBgoKCgoKCgoGCgoKCgoKCgoKC'
    )
    audioRef.current.volume = 0.5
  }, [])

  // Show notification for premium signals
  const notifyPremiumSignal = useCallback(
    (pair: PairAnalysisResult) => {
      if (!isEnabled) {
        return
      }
      if (permission !== 'granted') {
        return
      }

      // Check if we already notified for this pair recently
      const notifyKey = `${pair.symbol}-${Math.floor(Date.now() / 300000)}` // 5 min window
      if (lastNotifiedRef.current.has(notifyKey)) {
        return
      }

      lastNotifiedRef.current.add(notifyKey)

      // Create notification
      const notification = new Notification('💎 Premium Signal Detected!', {
        body: `${pair.symbol.replace('USDT', '')}/USDT: Z-Score ${pair.spreadZScore.toFixed(2)}σ, Correlation ${pair.correlation.toFixed(2)}`,
        icon: '/favicon.ico',
        tag: pair.symbol,
        requireInteraction: false,
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      // Play sound
      if (isSoundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {
          // Ignore autoplay errors
        })
      }

      // Clean up old notifications after 5 minutes
      setTimeout(() => {
        lastNotifiedRef.current.delete(notifyKey)
      }, 300000)
    },
    [isEnabled, permission, isSoundEnabled]
  )

  // Check analysis results for new premium signals
  const checkForPremiumSignals = useCallback(
    (results: PairAnalysisResult[], previousResults: PairAnalysisResult[]) => {
      if (!isEnabled || permission !== 'granted') {
        return
      }

      const previousPremium = new Set(
        previousResults
          .filter(r => r.volatilitySpread.signalQuality === 'premium')
          .map(r => r.symbol)
      )

      const newPremiumSignals = results.filter(
        r => r.volatilitySpread.signalQuality === 'premium' && !previousPremium.has(r.symbol)
      )

      // Notify for each new premium signal
      for (const signal of newPremiumSignals) {
        notifyPremiumSignal(signal)
      }
    },
    [isEnabled, permission, notifyPremiumSignal]
  )

  const toggleNotifications = useCallback(() => {
    setIsEnabled(prev => !prev)
  }, [])

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev)
  }, [])

  return {
    permission,
    isEnabled,
    isSoundEnabled,
    requestPermission,
    toggleNotifications,
    toggleSound,
    notifyPremiumSignal,
    checkForPremiumSignals,
  }
}
