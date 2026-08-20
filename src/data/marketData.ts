import {
  RANGE_DAYS,
  type HistoricalPoint,
  type MarketDataSnapshot,
  type Quote,
  type RangeKey,
  type SymbolKey,
} from './types'

/**
 * Derivations over the normalised snapshot.
 *
 * Everything here is pure: given a snapshot it computes the numbers the UI
 * renders. No provider knowledge, no fetching.
 */

export function quoteOf(
  snapshot: MarketDataSnapshot | null,
  symbol: SymbolKey,
): Quote | null {
  const result = snapshot?.results[symbol]
  return result && result.status === 'ok' ? result.quote : null
}

export function errorOf(
  snapshot: MarketDataSnapshot | null,
  symbol: SymbolKey,
): string | null {
  const result = snapshot?.results[symbol]
  return result && result.status === 'error' ? result.message : null
}

/** Slice a daily series down to the selected window. */
export function sliceRange(history: HistoricalPoint[], range: RangeKey): HistoricalPoint[] {
  const days = RANGE_DAYS[range]
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - days)
  const cutoffISO = cutoff.toISOString().slice(0, 10)
  const windowed = history.filter((p) => p.date >= cutoffISO)
  // Always give the chart something to draw, even on a sparse series.
  return windowed.length >= 2 ? windowed : history.slice(-Math.max(2, Math.min(history.length, 5)))
}

export type Direction = 'up' | 'down' | 'flat'

/** Treat a move smaller than the display precision as flat rather than a signal. */
export function directionOf(change: number, epsilon = 0.005): Direction {
  if (change > epsilon) return 'up'
  if (change < -epsilon) return 'down'
  return 'flat'
}

export const DIRECTION_ARROW: Record<Direction, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
}

export interface Spread {
  vix: number
  vxn: number
  /** VXN − VIX */
  difference: number
  /** VXN / VIX */
  ratio: number
}

export function computeSpread(vix: Quote | null, vxn: Quote | null): Spread | null {
  if (!vix || !vxn || vix.current === 0) return null
  return {
    vix: vix.current,
    vxn: vxn.current,
    difference: vxn.current - vix.current,
    ratio: vxn.current / vix.current,
  }
}

/** The four cells of the price/volatility observation matrix. */
export type QuadrantId = 'up-down' | 'up-up' | 'down-down' | 'down-up'

export interface Quadrant {
  id: QuadrantId
  priceDirection: 'up' | 'down'
  volDirection: 'up' | 'down'
  title: string
  interpretation: string
}

export const QUADRANTS: Quadrant[] = [
  {
    id: 'up-down',
    priceDirection: 'up',
    volDirection: 'down',
    title: 'Price ↑ / Volatility ↓',
    interpretation: 'Calmer bullish environment',
  },
  {
    id: 'up-up',
    priceDirection: 'up',
    volDirection: 'up',
    title: 'Price ↑ / Volatility ↑',
    interpretation: 'Rising market with increasing expected volatility',
  },
  {
    id: 'down-down',
    priceDirection: 'down',
    volDirection: 'down',
    title: 'Price ↓ / Volatility ↓',
    interpretation: 'Decline without increasing volatility',
  },
  {
    id: 'down-up',
    priceDirection: 'down',
    volDirection: 'up',
    title: 'Price ↓ / Volatility ↑',
    interpretation: 'Risk-off / volatility expansion',
  },
]

/**
 * Which quadrant today's Nasdaq-100 and VXN moves land in.
 *
 * Returns `null` when either input is missing or flat — the matrix describes an
 * observed combination, so an unchanged reading has no cell.
 */
export function activeQuadrant(ndx: Quote | null, vxn: Quote | null): Quadrant | null {
  if (!ndx || !vxn) return null
  const price = directionOf(ndx.changePercent, 0.01)
  const vol = directionOf(vxn.changePercent, 0.01)
  if (price === 'flat' || vol === 'flat') return null
  return (
    QUADRANTS.find((q) => q.priceDirection === price && q.volDirection === vol) ?? null
  )
}
