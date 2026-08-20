import { useCallback, useEffect, useRef, useState } from 'react'
import { getProvider, type ProviderId } from '../data/providers'
import { ALL_SYMBOLS, type MarketDataSnapshot } from '../data/types'
import { isRegularSession } from '../data/marketStatus'
import { useLocalStorage } from './useLocalStorage'

const CACHE_KEY = 'vxpanel.lastSnapshot.v1'
const AUTO_REFRESH_MS = 5 * 60 * 1000

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export interface MarketDataState {
  snapshot: MarketDataSnapshot | null
  loadState: LoadState
  /** Set when the whole fetch failed, not when a single symbol failed. */
  error: string | null
  /** `true` when everything on screen came from cache after a failed refresh. */
  isStale: boolean
  refresh: () => void
}

/**
 * Owns fetching, auto-refresh and the last-good cache.
 *
 * On a failed refresh the previous snapshot is kept and flagged stale so the UI
 * can show "Data unavailable" together with the last successful timestamp —
 * values are never invented to fill a gap, and demo data is never substituted
 * automatically for a failed live fetch.
 */
export function useMarketData(providerId: ProviderId, autoRefresh: boolean): MarketDataState {
  const [cached, setCached] = useLocalStorage<MarketDataSnapshot | null>(CACHE_KEY, null)
  const [snapshot, setSnapshot] = useState<MarketDataSnapshot | null>(cached)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState<boolean>(cached !== null)

  const abortRef = useRef<AbortController | null>(null)
  // Keeps the auto-refresh interval from re-arming on every render.
  const runRef = useRef<() => void>(() => {})

  const load = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoadState('loading')
    try {
      const provider = getProvider(providerId)
      const next = await provider.fetchSnapshot(ALL_SYMBOLS, controller.signal)

      const anyOk = ALL_SYMBOLS.some((s) => next.results[s]?.status === 'ok')
      if (!anyOk) {
        const first = ALL_SYMBOLS.map((s) => next.results[s]).find(
          (r) => r && r.status === 'error',
        )
        throw new Error(
          first && first.status === 'error' ? first.message : 'No instruments returned data',
        )
      }

      setSnapshot(next)
      setError(null)
      setIsStale(false)
      setLoadState('ready')
      // Only live snapshots are worth restoring on reload; demo data rebuilds
      // itself deterministically and should not masquerade as a cached quote.
      if (!next.isDemo) setCached(next)
    } catch (err) {
      if (controller.signal.aborted) return
      setError(err instanceof Error ? err.message : 'Unable to reach the data provider')
      setIsStale(true)
      setLoadState('error')
    }
  }, [providerId, setCached])

  runRef.current = load

  useEffect(() => {
    void load()
    return () => abortRef.current?.abort()
  }, [load])

  useEffect(() => {
    if (!autoRefresh) return
    const id = window.setInterval(() => {
      // Outside the regular session the underlying values do not move, so
      // polling would only make stale data look live.
      if (isRegularSession()) runRef.current()
    }, AUTO_REFRESH_MS)
    return () => window.clearInterval(id)
  }, [autoRefresh])

  return { snapshot, loadState, error, isStale, refresh: load }
}
