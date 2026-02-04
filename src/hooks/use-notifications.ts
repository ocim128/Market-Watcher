'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PairAnalysisResult } from '@/types'

interface UseNotificationsOptions {
  enabled?: boolean
  soundEnabled?: boolean
}

const AUDIO_BASE64 =
  'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleVYvMGqe1/CjYiMyThyHvF5hgWcsXoV3fXN2dnOAgHt0cmNqaGlxfHl6gIB8fHx4foGCgHx6fHx+goKBf4CAgIGCgoKCgYGBgYGBgoKCgoKCgoGCgoKCgoKCgoKC'
const NOTIFICATION_COOLDOWN = 300000 // 5 minutes

function shouldNotify(pair: PairAnalysisResult, lastNotified: Set<string>): string | null {
  if (pair.confluence.rating < 2) {
    return null
  }
  const notifyKey = `${pair.symbol}-${Math.floor(Date.now() / NOTIFICATION_COOLDOWN)}`
  if (lastNotified.has(notifyKey)) {
    return null
  }
  return notifyKey
}

function createNotification(pair: PairAnalysisResult): Notification {
  const notification = new Notification(
    `💎 Premium Signal (Confluence ${pair.confluence.rating}/3)`,
    {
      body: `${pair.symbol.replace('USDT', '')}/USDT: Z-Score ${pair.spreadZScore.toFixed(2)}σ, Correlation ${pair.correlation.toFixed(2)}`,
      icon: '/favicon.ico',
      tag: pair.symbol,
      requireInteraction: false,
    }
  )

  notification.onclick = () => {
    window.focus()
    notification.close()
  }
  return notification
}

export function useNotifications({
  enabled = true,
  soundEnabled = true,
}: UseNotificationsOptions = {}) {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isEnabled, setIsEnabled] = useState(enabled)
  const [isSoundEnabled, setIsSoundEnabled] = useState(soundEnabled)
  const lastNotifiedRef = useRef<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    audioRef.current = new Audio(AUDIO_BASE64)
    audioRef.current.volume = 0.5
  }, [])

  const notifyPremiumSignal = useCallback(
    (pair: PairAnalysisResult) => {
      if (!isEnabled || permission !== 'granted') {
        return
      }

      const notifyKey = shouldNotify(pair, lastNotifiedRef.current)
      if (!notifyKey) {
        return
      }

      lastNotifiedRef.current.add(notifyKey)
      createNotification(pair)

      if (isSoundEnabled && audioRef.current) {
        audioRef.current.play().catch(() => {
          /* Ignore autoplay errors */
        })
      }

      setTimeout(() => lastNotifiedRef.current.delete(notifyKey), NOTIFICATION_COOLDOWN)
    },
    [isEnabled, permission, isSoundEnabled]
  )

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
        r =>
          r.volatilitySpread.signalQuality === 'premium' &&
          r.confluence.rating >= 2 &&
          !previousPremium.has(r.symbol)
      )

      newPremiumSignals.forEach(signal => notifyPremiumSignal(signal))
    },
    [isEnabled, permission, notifyPremiumSignal]
  )

  const toggleNotifications = useCallback(() => setIsEnabled(prev => !prev), [])
  const toggleSound = useCallback(() => setIsSoundEnabled(prev => !prev), [])

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
