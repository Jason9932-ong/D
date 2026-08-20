import type { MarketDataProvider } from './marketDataProvider'
import { demoProvider } from './demoProvider'
import { yahooProvider } from './yahooProvider'

export type { MarketDataProvider } from './marketDataProvider'
export type ProviderId = 'yahoo' | 'demo'

/**
 * Provider registry. Register additional sources here — for example a
 * VXN-specific adapter if a future primary source stops carrying it.
 */
export const PROVIDERS: Record<ProviderId, MarketDataProvider> = {
  yahoo: yahooProvider,
  demo: demoProvider,
}

export function getProvider(id: ProviderId): MarketDataProvider {
  return PROVIDERS[id] ?? PROVIDERS.yahoo
}
