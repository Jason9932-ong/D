import type { MarketDataSnapshot, QuoteResult, SymbolKey } from '../types'
import type { MarketDataProvider } from './marketDataProvider'
import { officialProvider } from './officialProvider'
import { yahooProvider } from './yahooProvider'

/**
 * Tries live sources in order and fills each instrument from the first one that
 * returns it.
 *
 * This exists because the two live sources fail in different ways and cover
 * different instruments:
 *   - Yahoo has intraday values for everything, but rate-limits cookie-less
 *     requests with HTTP 429 — which is exactly what a local proxy sends.
 *   - CBOE/FRED are official and reliable but publish daily closes only, and
 *     carry no ETF prices (so QQQ has no fallback).
 *
 * Falling back between two LIVE sources is safe: every value is still real
 * market data, and each quote carries the `sourceName` that produced it. Demo
 * data is never part of this chain — synthetic values must always be an
 * explicit user choice.
 */

const CHAIN: MarketDataProvider[] = [yahooProvider, officialProvider]

export const compositeProvider: MarketDataProvider = {
  id: 'auto',
  name: 'Auto (Yahoo → CBOE/FRED)',
  isDemo: false,

  async fetchSnapshot(symbols, signal): Promise<MarketDataSnapshot> {
    const results = {} as Record<SymbolKey, QuoteResult>
    let pending = [...symbols]

    for (const provider of CHAIN) {
      if (pending.length === 0) break

      let snapshot: MarketDataSnapshot
      try {
        snapshot = await provider.fetchSnapshot(pending, signal)
      } catch (err) {
        if (signal?.aborted) throw err
        // A provider that blew up entirely simply contributes nothing; the
        // next one in the chain gets the same pending list.
        continue
      }

      const stillPending: SymbolKey[] = []
      for (const symbol of pending) {
        const result = snapshot.results[symbol]
        if (result?.status === 'ok') {
          results[symbol] = result
        } else {
          // Keep the first failure's message — it explains the primary source's
          // problem, which is the more useful one to surface.
          if (!results[symbol] && result) results[symbol] = result
          stillPending.push(symbol)
        }
      }
      pending = stillPending
    }

    // Name the sources that actually contributed, so the header reflects
    // reality rather than the chain's configuration.
    const used = new Set<string>()
    for (const symbol of symbols) {
      const result = results[symbol]
      if (result?.status === 'ok' && result.quote.sourceName) {
        used.add(result.quote.sourceName)
      }
    }

    return {
      fetchedAt: Date.now(),
      isDemo: false,
      providerName: used.size > 0 ? [...used].join(' + ') : compositeProvider.name,
      results,
    }
  },
}
