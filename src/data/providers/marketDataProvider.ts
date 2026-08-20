import type { MarketDataSnapshot, SymbolKey } from '../types'

/**
 * The contract between the UI and any market-data source.
 *
 * Adding a new source (a paid API, a local CSV, a separate VXN-only feed)
 * means implementing this interface and registering it in `./index.ts`.
 * No UI component changes.
 */
export interface MarketDataProvider {
  /** Stable id used for persistence and the provider switch. */
  id: string
  /** Shown in the footer / data-source line. */
  name: string
  /** `true` when values are synthetic and must be badged DEMO DATA. */
  isDemo: boolean
  /**
   * Fetch every requested symbol. Implementations must resolve with a
   * per-symbol result rather than rejecting the whole call, so that one
   * unavailable instrument (e.g. VXN) does not take down the others.
   */
  fetchSnapshot(symbols: SymbolKey[], signal?: AbortSignal): Promise<MarketDataSnapshot>
}
