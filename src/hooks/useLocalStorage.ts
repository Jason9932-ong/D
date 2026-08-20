import { useCallback, useEffect, useState } from 'react'

/**
 * State persisted to localStorage. Used for user preferences (chart range,
 * theme, provider, auto-refresh, learning-mode panel) and for the last
 * successfully retrieved snapshot.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage can be unavailable (private mode, quota). Preferences are
      // non-essential, so failing to persist is not surfaced to the user.
    }
  }, [key, value])

  const reset = useCallback(() => setValue(initial), [initial])

  return [value, setValue, reset] as const
}
