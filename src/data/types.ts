/**
 * Normalised market-data shapes.
 *
 * Every provider must return these structures. The UI imports from this file
 * only — it never imports a provider module or a vendor-specific response type.
 */

/** Instruments the dashboard knows about. */
export type SymbolKey = 'VIX' | 'VXN' | 'NDX' | 'QQQ' | 'SPX'

/** What an instrument measures. Drives colour logic and copy. */
export type InstrumentKind = 'volatility' | 'price'

export interface HistoricalPoint {
  /** ISO date of the session, `YYYY-MM-DD`, in the exchange's local calendar. */
  date: string
  /** Session close. For the in-progress session this is the latest price. */
  close: number
  /** Close minus previous close. `null` for the first point in the series. */
  change: number | null
  /** Percentage change vs previous close. `null` for the first point. */
  changePercent: number | null
}

/** The standard structure every provider returns for a single instrument. */
export interface Quote {
  symbol: SymbolKey
  /** Vendor ticker actually queried, e.g. `^VIX`. Shown in the data source line. */
  vendorSymbol: string
  displayName: string
  kind: InstrumentKind
  /** Timestamp of the market data itself (epoch ms), from the upstream feed. */
  timestamp: number
  current: number
  previousClose: number
  /** current - previousClose */
  change: number
  /** (current - previousClose) / previousClose * 100 */
  changePercent: number
  /** Oldest → newest. Up to ~1 year of daily closes. */
  historical: HistoricalPoint[]
  /**
   * Which upstream actually supplied this instrument. Set when a snapshot can
   * mix sources (e.g. intraday Yahoo for one symbol, official CBOE for another),
   * so the UI can show provenance per instrument rather than per snapshot.
   */
  sourceName?: string
}

/** A per-symbol result, so one failed instrument cannot hide the others. */
export type QuoteResult =
  | { status: 'ok'; quote: Quote }
  | { status: 'error'; symbol: SymbolKey; message: string }

export interface MarketDataSnapshot {
  /** When this snapshot was assembled locally (epoch ms). */
  fetchedAt: number
  /** `true` when the values are synthetic and must be labelled DEMO DATA. */
  isDemo: boolean
  /** Human-readable provider name, e.g. "Yahoo Finance". */
  providerName: string
  results: Record<SymbolKey, QuoteResult>
}

/** Chart/history window the user can switch between. */
export type RangeKey = '7D' | '30D' | '90D' | '1Y'

export const RANGE_DAYS: Record<RangeKey, number> = {
  '7D': 7,
  '30D': 30,
  '90D': 90,
  '1Y': 365,
}

export const ALL_SYMBOLS: SymbolKey[] = ['VIX', 'VXN', 'NDX', 'QQQ', 'SPX']

export interface SymbolMeta {
  vendorSymbol: string
  displayName: string
  /** Short label used in tight spaces. */
  shortName: string
  kind: InstrumentKind
  /** Decimal places used when rendering the value. */
  precision: number
}

export const SYMBOL_META: Record<SymbolKey, SymbolMeta> = {
  VIX: {
    vendorSymbol: '^VIX',
    displayName: 'CBOE Volatility Index',
    shortName: 'VIX',
    kind: 'volatility',
    precision: 2,
  },
  VXN: {
    vendorSymbol: '^VXN',
    displayName: 'CBOE Nasdaq-100 Volatility Index',
    shortName: 'VXN',
    kind: 'volatility',
    precision: 2,
  },
  NDX: {
    vendorSymbol: '^NDX',
    displayName: 'Nasdaq-100',
    shortName: 'NASDAQ-100',
    kind: 'price',
    precision: 2,
  },
  QQQ: {
    vendorSymbol: 'QQQ',
    displayName: 'Invesco QQQ Trust',
    shortName: 'QQQ',
    kind: 'price',
    precision: 2,
  },
  SPX: {
    vendorSymbol: '^GSPC',
    displayName: 'S&P 500',
    shortName: 'S&P 500',
    kind: 'price',
    precision: 2,
  },
}
