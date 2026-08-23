import type { MarketStatus } from '../data/marketStatus'
import { PROVIDER_OPTIONS, type ProviderId } from '../data/providers'

const STATUS_STYLE: Record<MarketStatus, string> = {
  OPEN: 'text-emerald-700 dark:text-emerald-400',
  'PRE-MARKET': 'text-amber-700 dark:text-amber-400',
  'AFTER-HOURS': 'text-amber-700 dark:text-amber-400',
  CLOSED: 'text-neutral-500 dark:text-neutral-400',
}

export function Header({
  status,
  nowSGT,
  lastUpdated,
  dataTimestamp,
  providerId,
  providerName,
  isDemo,
  isLoading,
  autoRefresh,
  isDark,
  onRefresh,
  onProviderChange,
  onAutoRefreshChange,
  onThemeToggle,
}: {
  status: MarketStatus
  nowSGT: string
  lastUpdated: string | null
  dataTimestamp: string | null
  providerId: ProviderId
  providerName: string
  isDemo: boolean
  isLoading: boolean
  autoRefresh: boolean
  isDark: boolean
  onRefresh: () => void
  onProviderChange: (next: ProviderId) => void
  onAutoRefreshChange: (next: boolean) => void
  onThemeToggle: () => void
}) {
  return (
    <header className="border-b hairline pb-3">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-base font-semibold tracking-wide">Volatility Panel</h1>
            {isDemo && (
              <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-2xs font-semibold tracking-[0.12em] text-amber-700 ring-1 ring-inset ring-amber-600/30 dark:text-amber-300">
                DEMO DATA
              </span>
            )}
          </div>
          <p className="mt-0.5 text-2xs text-neutral-500 dark:text-neutral-400">
            VIX · VXN · Nasdaq-100 · S&amp;P 500 — observation only, not financial advice
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <div>
            <div className="label">US Market</div>
            <div className={`mt-0.5 text-sm font-medium tracking-wide ${STATUS_STYLE[status]}`}>
              {status}
            </div>
          </div>

          <div>
            <div className="label">Singapore time</div>
            <div className="tnum mt-0.5 text-sm">{nowSGT}</div>
          </div>

          <div>
            <div className="label">Last updated</div>
            <div className="tnum mt-0.5 text-sm">{lastUpdated ?? '—'}</div>
          </div>

          <div>
            <div className="label">Data timestamp</div>
            <div className="tnum mt-0.5 text-sm">{dataTimestamp ?? '—'}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="rounded border border-neutral-300 px-2.5 py-1 text-2xs font-medium tracking-wider text-neutral-700 transition-colors hover:border-neutral-500 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
            >
              {isLoading ? 'REFRESHING…' : 'REFRESH'}
            </button>
            <button
              type="button"
              onClick={onThemeToggle}
              aria-label="Toggle colour theme"
              className="rounded border border-neutral-300 px-2.5 py-1 text-2xs font-medium tracking-wider text-neutral-700 transition-colors hover:border-neutral-500 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-500"
            >
              {isDark ? 'LIGHT' : 'DARK'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-2xs text-neutral-500 dark:text-neutral-400">
        <label className="flex items-center gap-1.5">
          <span className="uppercase tracking-[0.12em]">Source</span>
          <select
            value={providerId}
            onChange={(e) => onProviderChange(e.target.value as ProviderId)}
            className="rounded border border-neutral-300 bg-transparent px-1.5 py-0.5 text-2xs text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
          >
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => onAutoRefreshChange(e.target.checked)}
            className="h-3 w-3 accent-neutral-700 dark:accent-neutral-300"
          />
          <span className="uppercase tracking-[0.12em]">Auto-refresh 5 min</span>
        </label>

        <span>
          Provider: {providerName}
          {status !== 'OPEN' && !isDemo && ' · market closed, values are last session’s'}
        </span>
      </div>
    </header>
  )
}
