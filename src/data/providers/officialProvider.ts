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
 * Official-source provider: CBOE for VIX, VXN and SPX; FRED for the Nasdaq-100,
 * which CBOE does not redistribute.
 *
 * Why this exists: the Yahoo endpoint is undocumented and rate-limits
 * cookie-less requests with HTTP 429, which makes it unreliable as a sole
 * source. CBOE is the exchange that computes VIX and VXN, and FRED is the
 * Federal Reserve's own series — both are free, keyless, and stable.
 *
 * Trade-off: these publish DAILY CLOSES only, so there is no intraday value.
 * The quote's timestamp is therefore the session close it came from, not the
 * moment it was downloaded.
 *
 * QQQ is deliberately unsupported here — neither source publishes ETF prices,
 * and deriving it from the Nasdaq-100 would be inventing a number. It reports
 * as unavailable instead.
 */

const CBOE_HISTORY: Partial<Record<SymbolKey, string>> = {
  VIX: '/api/cboe/api/global/us_indices/daily_prices/VIX_History.csv',
  VXN: '/api/cboe/api/global/us_indices/daily_prices/VXN_History.csv',
  SPX: '/api/cboe/api/global/us_indices/daily_prices/SPX_History.csv',
}

/**
 * FRED covers what CBOE does not redistribute. It sits behind Akamai bot
 * management, so it can reset a proxied request — treat it as best-effort:
 * when it fails, only the instrument it backs is affected.
 */
const FRED_SERIES: Partial<Record<SymbolKey, string>> = {
  NDX: 'NASDAQ100',
}

/** Keep roughly two years of sessions — more than the 1Y window ever needs. */
const MAX_POINTS = 520

interface Row {
  date: string
  close: number
}

/**
 * The UTC instant matching 16:00 New York time on a session date, used as the
 * data timestamp. New York is always a whole number of hours from UTC, so one
 * correction step is exact.
 */
function sessionCloseEpoch(isoDate: string): number {
  const guess = Date.parse(`${isoDate}T16:00:00Z`)
  if (Number.isNaN(guess)) return Date.now()
  const nyHour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hour12: false,
    }).format(guess),
  )
  // `nyHour` can wrap to 24 at midnight in some runtimes.
  return guess + (16 - (nyHour % 24)) * 3600_000
}

async function fetchCsv(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Upstream responded ${res.status}`)
  const text = await res.text()
  if (text.trimStart().startsWith('<')) {
    throw new Error('Upstream returned a web page instead of CSV')
  }
  return text
}

/**
 * CBOE, with US-style `MM/DD/YYYY` dates. Column layout varies by index —
 * the volatility files are `DATE,OPEN,HIGH,LOW,CLOSE` while SPX is `DATE,SPX` —
 * but the close is the last column in both, so the header sets the index.
 */
function parseCboe(csv: string): Row[] {
  const lines = csv.split('\n')
  const columns = (lines[0] ?? '').trim().split(',').length
  if (columns < 2) throw new Error('Unrecognised CBOE CSV layout')
  const closeIndex = columns - 1

  const rows: Row[] = []
  for (const line of lines.slice(1)) {
    const cells = line.trim().split(',')
    if (cells.length !== columns) continue
    const [month, day, year] = cells[0].split('/')
    const close = Number(cells[closeIndex])
    if (!year || !month || !day || !Number.isFinite(close)) continue
    rows.push({ date: `${year}-${month}-${day}`, close })
  }
  return rows
}

/** FRED: `observation_date,SERIES_ID` with ISO dates; `.` marks a gap. */
function parseFred(csv: string): Row[] {
  const rows: Row[] = []
  for (const line of csv.split('\n').slice(1)) {
    const cells = line.trim().split(',')
    if (cells.length < 2) continue
    const close = Number(cells[1])
    // Holidays and non-trading days arrive as "." and must be dropped, not
    // carried forward as a repeated price.
    if (cells[1] === '.' || !Number.isFinite(close)) continue
    rows.push({ date: cells[0], close })
  }
  return rows
}

function toQuote(symbol: SymbolKey, rows: Row[], sourceName: string): Quote {
  const series = rows.slice(-MAX_POINTS)
  if (series.length < 2) {
    throw new Error('Not enough history returned')
  }

  const current = series[series.length - 1].close
  const previousClose = series[series.length - 2].close
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
    // Daily data: the timestamp is the session this close belongs to.
    timestamp: sessionCloseEpoch(series[series.length - 1].date),
    current,
    previousClose,
    change,
    changePercent: (change / previousClose) * 100,
    historical: withChanges(series),
    sourceName,
  }
}

async function fetchOne(symbol: SymbolKey, signal?: AbortSignal): Promise<Quote> {
  const cboe = CBOE_HISTORY[symbol]
  if (cboe) {
    return toQuote(symbol, parseCboe(await fetchCsv(cboe, signal)), 'CBOE')
  }

  const fred = FRED_SERIES[symbol]
  if (fred) {
    const csv = await fetchCsv(`/api/fred/graph/fredgraph.csv?id=${fred}`, signal)
    return toQuote(symbol, parseFred(csv), 'FRED')
  }

  throw new Error('Not published by CBOE or FRED')
}

export const officialProvider: MarketDataProvider = {
  id: 'official',
  name: 'CBOE + FRED (official, daily close)',
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
      providerName: officialProvider.name,
      results,
    }
  },
}
