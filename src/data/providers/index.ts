import type { MarketDataProvider } from './marketDataProvider'
import { compositeProvider } from './compositeProvider'
import { demoProvider } from './demoProvider'
import { officialProvider } from './officialProvider'
import { yahooProvider } from './yahooProvider'

export type { MarketDataProvider } from './marketDataProvider'
export type ProviderId = 'auto' | 'yahoo' | 'official' | 'demo'

/**
 * Provider registry. Register additional sources here — for example a
 * VXN-specific adapter if a future primary source stops carrying it.
 */
export const PROVIDERS: Record<ProviderId, MarketDataProvider> = {
  auto: compositeProvider,
  yahoo: yahooProvider,
  official: officialProvider,
  demo: demoProvider,
}

/** Options shown in the header's source selector, in display order. */
export const PROVIDER_OPTIONS: { id: ProviderId; label: string }[] = [
  { id: 'auto', label: 'Auto — Yahoo, falling back to CBOE/FRED' },
  { id: 'yahoo', label: 'Yahoo Finance — intraday' },
  { id: 'official', label: 'CBOE + FRED — official, daily close' },
  { id: 'demo', label: 'Demo — synthetic data' },
]

export function getProvider(id: ProviderId): MarketDataProvider {
  return PROVIDERS[id] ?? PROVIDERS.auto
}
