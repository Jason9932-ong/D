import {
  SYMBOL_META,
  type HistoricalPoint,
  type MarketDataSnapshot,
  type Quote,
  type QuoteResult,
  type SymbolKey,
} from '../types'
import type { MarketDataProvider } from './marketDataProvider'

/**
 * Live provider backed by the Yahoo Finance chart endpoint.
 *
 * It serves ^VIX and ^VXN from the same endpoint, so no separate VXN adapter is
 * required. Requests go through the Vite dev-server proxy (see vite.config.ts)
 * because the upstream sends no CORS headers.
 *
 * One year of daily closes is fetched per symbol; the 7D / 30D / 90D / 1Y
 * switches slice that series locally instead of re-fetching.
 */

const BASE = '/api/yahoo/v8/finance/chart'

interface YahooMeta {
  symbol: string
  regularMarketPrice: number
  regularMarketTime: number
  chartPreviousClose?: number
  exchangeTimezoneName?: string
  shortName?: string
}

interface YahooResult {
  meta: YahooMeta
  timestamp?: number[]
  indicators: { quote: { close?: (number | null)[] }[] }
}

/** Format an epoch-seconds timestamp as a `YYYY-MM-DD` date in a given IANA zone. */
function sessionDate(epochSeconds: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(epochSeconds * 1000))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Attach per-session change / percent change to a close-only series. */
export function withChanges(series: { date: string; close: number }[]): HistoricalPoint[] {
  return series.map((point, i) => {
    if (i === 0) return { ...point, change: null, changePercent: null }
    const prev = series[i - 1].close
    const change = point.close - prev
    return {
      ...point,
      change,
      changePercent: prev === 0 ? null : (change / prev) * 100,
    }
  })
}

function parseChart(symbol: SymbolKey, result: YahooResult): Quote {
  const meta = result.meta
  const tz = meta.exchangeTimezoneName ?? 'America/New_York'
  const timestamps = result.timestamp ?? []
  const closes = result.indicators?.quote?.[0]?.close ?? []

  // Drop gaps (Yahoo emits nulls for sessions with no print).
  const series: { date: string; close: number }[] = []
  for (let i = 0; i < timestamps.length; i++) {
    const close = closes[i]
    if (close === null || close === undefined || !Number.isFinite(close)) continue
    series.push({ date: sessionDate(timestamps[i], tz), close })
  }

  if (series.length === 0) {
    throw new Error('No usable price history returned')
  }

  const current = Number.isFinite(meta.regularMarketPrice)
    ? meta.regularMarketPrice
    : series[series.length - 1].close

  // The last daily bar is the current (possibly in-progress) session, so the
  // previous close is the bar before it. Fall back to the chart's own previous
  // close when only a single session came back.
  const previousClose =
    series.length >= 2
      ? series[series.length - 2].close
      : (meta.chartPreviousClose ?? series[series.length - 1].close)

  // Keep the last point in step with the live quote.
  series[series.length - 1] = { ...series[series.length - 1], close: current }

  if (!Number.isFinite(previousClose) || previousClose === 0) {
    throw new Error('Previous close unavailable')
  }

  const change = current - previousClose
  const info = SYMBOL_META[symbol]

  return {
    symbol,
    vendorSymbol: info.vendorSymbol,
    displayName: info.displayName,
    kind: info.kind,
    timestamp: (meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
    current,
    previousClose,
    change,
    changePercent: (change / previousClose) * 100,
    historical: withChanges(series),
  }
}

async function fetchOne(symbol: SymbolKey, signal?: AbortSignal): Promise<Quote> {
  const ticker = encodeURIComponent(SYMBOL_META[symbol].vendorSymbol)
  const res = await fetch(`${BASE}/${ticker}?range=1y&interval=1d`, { signal })
  if (!res.ok) {
    throw new Error(`Upstream responded ${res.status}`)
  }
  const body = await res.json()
  const err = body?.chart?.error
  if (err) throw new Error(err.description ?? 'Upstream error')
  const result: YahooResult | undefined = body?.chart?.result?.[0]
  if (!result) throw new Error('Empty response')
  return parseChart(symbol, result)
}

export const yahooProvider: MarketDataProvider = {
  id: 'yahoo',
  name: 'Yahoo Finance',
  isDemo: false,

  async fetchSnapshot(symbols, signal): Promise<MarketDataSnapshot> {
    const settled = await Promise.allSettled(symbols.map((s) => fetchOne(s, signal)))

    const results = {} as Record<SymbolKey, QuoteResult>
    symbols.forEach((symbol, i) => {
      const outcome = settled[i]
      results[symbol] =
        outcome.status === 'fulfilled'
          ? { status: 'ok', quote: outcome.value }
          : {
              status: 'error',
              symbol,
              message:
                outcome.reason instanceof Error ? outcome.reason.message : 'Request failed',
            }
    })

    return {
      fetchedAt: Date.now(),
      isDemo: false,
      providerName: yahooProvider.name,
      results,
    }
  },
}
