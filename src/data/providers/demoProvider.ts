import {
  SYMBOL_META,
  type MarketDataSnapshot,
  type Quote,
  type QuoteResult,
  type SymbolKey,
} from '../types'
import type { MarketDataProvider } from './marketDataProvider'
import { withChanges } from './yahooProvider'

/**
 * Offline provider producing SYNTHETIC values.
 *
 * This exists so the dashboard is usable with no network access. It is never
 * selected automatically in place of a failed live fetch — the user turns it on
 * explicitly, and every snapshot it returns carries `isDemo: true` so the UI can
 * badge it DEMO DATA. These numbers are not, and must never be shown as, real
 * market data.
 */

/** Deterministic PRNG so a page reload does not reshuffle the demo series. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0x100000000
  }
}

interface DemoSpec {
  /** Starting level one year ago. */
  start: number
  /** Daily drift applied to the log level. */
  drift: number
  /** Daily volatility of the synthetic walk. */
  noise: number
  /** Pull back toward `start` — keeps vol series in a believable band. */
  meanReversion: number
  seed: number
}

const SPECS: Record<SymbolKey, DemoSpec> = {
  VIX: { start: 16.5, drift: 0, noise: 0.055, meanReversion: 0.05, seed: 11 },
  VXN: { start: 21.5, drift: 0, noise: 0.05, meanReversion: 0.045, seed: 23 },
  NDX: { start: 26800, drift: 0.0004, noise: 0.011, meanReversion: 0, seed: 37 },
  QQQ: { start: 652, drift: 0.0004, noise: 0.011, meanReversion: 0, seed: 37 },
  SPX: { start: 7150, drift: 0.0003, noise: 0.008, meanReversion: 0, seed: 51 },
}

/** Weekday sessions for the past `count` trading days, oldest → newest. */
function tradingDays(count: number): string[] {
  const dates: string[] = []
  const cursor = new Date()
  cursor.setUTCHours(0, 0, 0, 0)
  while (dates.length < count) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) dates.unshift(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return dates
}

function buildQuote(symbol: SymbolKey): Quote {
  const spec = SPECS[symbol]
  const rand = seeded(spec.seed)
  const dates = tradingDays(260)

  let level = spec.start
  const series = dates.map((date) => {
    // Box–Muller for a normal shock.
    const u1 = Math.max(rand(), 1e-9)
    const u2 = rand()
    const shock = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    const pull = spec.meanReversion * Math.log(spec.start / level)
    level = level * Math.exp(spec.drift + pull + spec.noise * shock)
    return { date, close: Number(level.toFixed(SYMBOL_META[symbol].precision)) }
  })

  const current = series[series.length - 1].close
  const previousClose = series[series.length - 2].close
  const change = current - previousClose
  const info = SYMBOL_META[symbol]

  return {
    symbol,
    vendorSymbol: `${info.vendorSymbol} (demo)`,
    displayName: info.displayName,
    kind: info.kind,
    timestamp: Date.now(),
    current,
    previousClose,
    change,
    changePercent: (change / previousClose) * 100,
    historical: withChanges(series),
  }
}

export const demoProvider: MarketDataProvider = {
  id: 'demo',
  name: 'Demo (synthetic)',
  isDemo: true,

  async fetchSnapshot(symbols): Promise<MarketDataSnapshot> {
    const results = {} as Record<SymbolKey, QuoteResult>
    for (const symbol of symbols) {
      results[symbol] = { status: 'ok', quote: buildQuote(symbol) }
    }
    return {
      fetchedAt: Date.now(),
      isDemo: true,
      providerName: demoProvider.name,
      results,
    }
  },
}
