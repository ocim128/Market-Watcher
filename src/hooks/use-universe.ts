'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createUniverseBuilder,
  DEFAULT_SCANNER_SETTINGS,
  type UniverseEntry,
  type UniverseSettings,
  type UniverseSnapshot,
} from '@/lib/scanner'

const STORAGE_KEY = 'market-watcher-scanner-universe'

interface UniverseProgress {
  done: number
  total: number
  symbol: string
}

interface UseUniverseReturn {
  universe: UniverseEntry[]
  settings: UniverseSettings
  lastUpdated: number | null
  isLoading: boolean
  isStale: boolean
  progress: UniverseProgress
  error: string | null
  refreshUniverse: () => Promise<void>
  setSettings: (settings: Partial<UniverseSettings>) => void
}

function mergeSettings(settings: Partial<UniverseSettings>): UniverseSettings {
  return {
    ...DEFAULT_SCANNER_SETTINGS,
    ...settings,
    thresholds: {
      ...DEFAULT_SCANNER_SETTINGS.thresholds,
      ...(settings.thresholds ?? {}),
    },
    exclusions: settings.exclusions ?? DEFAULT_SCANNER_SETTINGS.exclusions,
  }
}

function loadSnapshot(): UniverseSnapshot | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as UniverseSnapshot
    if (!parsed || !Array.isArray(parsed.entries) || !parsed.settings) {
      return null
    }

    return {
      ...parsed,
      settings: mergeSettings(parsed.settings),
    }
  } catch {
    return null
  }
}

function saveSnapshot(snapshot: UniverseSnapshot): void {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

export function useUniverse(): UseUniverseReturn {
  const [snapshot, setSnapshot] = useState<UniverseSnapshot | null>(null)
  const [settings, setSettingsState] = useState<UniverseSettings>(DEFAULT_SCANNER_SETTINGS)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<UniverseProgress>({ done: 0, total: 0, symbol: '' })
  const [lastAutoRefreshAttempt, setLastAutoRefreshAttempt] = useState(0)

  const loadFromStorage = useCallback(() => {
    const saved = loadSnapshot()
    if (saved) {
      setSnapshot(saved)
      setSettingsState(saved.settings)
    }
  }, [])

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  const lastUpdated = snapshot?.updatedAt ?? null

  const isStale = useMemo(() => {
    if (!lastUpdated) {
      return true
    }

    const refreshMs = settings.refreshIntervalDays * 24 * 60 * 60 * 1000
    return Date.now() - lastUpdated > refreshMs
  }, [lastUpdated, settings.refreshIntervalDays])

  const refreshUniverse = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setProgress({ done: 0, total: 0, symbol: '' })

    try {
      const builder = createUniverseBuilder()
      const updated = await builder.build({
        settings,
        incremental: true,
        onProgress: (done, total, symbol) => setProgress({ done, total, symbol }),
      })

      setSnapshot(updated)
      saveSnapshot(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Universe refresh failed')
    } finally {
      setIsLoading(false)
    }
  }, [settings])

  useEffect(() => {
    if (!snapshot || isLoading || !isStale) {
      return
    }

    const now = Date.now()
    if (now - lastAutoRefreshAttempt < 60_000) {
      return
    }

    setLastAutoRefreshAttempt(now)
    void refreshUniverse()
  }, [isLoading, isStale, refreshUniverse, lastAutoRefreshAttempt])

  const setSettings = useCallback(
    (partial: Partial<UniverseSettings>) => {
      setSettingsState(prev => {
        const next = mergeSettings({
          ...prev,
          ...partial,
          thresholds: { ...prev.thresholds, ...(partial.thresholds ?? {}) },
        })

        if (snapshot) {
          const nextSnapshot: UniverseSnapshot = {
            ...snapshot,
            settings: next,
          }
          setSnapshot(nextSnapshot)
          saveSnapshot(nextSnapshot)
        }

        return next
      })
    },
    [snapshot]
  )

  return {
    universe: snapshot?.entries ?? [],
    settings,
    lastUpdated,
    isLoading,
    isStale,
    progress,
    error,
    refreshUniverse,
    setSettings,
  }
}
