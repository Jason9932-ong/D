import { useEffect, useMemo, useState } from 'react'
import { ChartsSection } from './components/ChartsSection'
import { DirectionMatrix } from './components/DirectionMatrix'
import { Header } from './components/Header'
import { IndexCard } from './components/IndexCard'
import { LearningMode } from './components/LearningMode'
import { Observation } from './components/Observation'
import { SpreadPanel } from './components/SpreadPanel'
import { Unavailable } from './components/Unavailable'
import { VolatilityCard } from './components/VolatilityCard'
import { activeQuadrant, computeSpread, errorOf, quoteOf } from './data/marketData'
import { SG_TZ, formatInZone, marketStatusAt } from './data/marketStatus'
import { buildObservation } from './data/observation'
import type { ProviderId } from './data/providers'
import { getProvider } from './data/providers'
import type { Quote, RangeKey } from './data/types'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useMarketData } from './hooks/useMarketData'

const VIX_TOOLTIP =
  'VIX measures expected volatility, not whether the S&P 500 will rise or fall. A higher VIX means options are pricing larger moves — in either direction.'
const VXN_TOOLTIP =
  'VXN measures expected volatility, not market direction. A rising VXN does not mean the Nasdaq-100 will fall; it means larger moves are being priced in.'

export default function App() {
  const [providerId, setProviderId] = useLocalStorage<ProviderId>('vxpanel.provider.v2', 'auto')
  const [range, setRange] = useLocalStorage<RangeKey>('vxpanel.range', '30D')
  const [autoRefresh, setAutoRefresh] = useLocalStorage<boolean>('vxpanel.autoRefresh', true)
  const [learningOpen, setLearningOpen] = useLocalStorage<boolean>('vxpanel.learning', false)
  const [isDark, setIsDark] = useLocalStorage<boolean>('vxpanel.dark', true)

  const { snapshot, loadState, error, isStale, refresh } = useMarketData(providerId, autoRefresh)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  // Drives the Singapore clock and the market-status pill.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const vix = quoteOf(snapshot, 'VIX')
  const vxn = quoteOf(snapshot, 'VXN')
  const ndx = quoteOf(snapshot, 'NDX')
  const qqq = quoteOf(snapshot, 'QQQ')
  const spx = quoteOf(snapshot, 'SPX')

  const spread = useMemo(() => computeSpread(vix, vxn), [vix, vxn])
  const quadrant = useMemo(() => activeQuadrant(ndx, vxn), [ndx, vxn])
  const observation = useMemo(
    () => buildObservation({ vix, vxn, ndx, spx, spread }),
    [vix, vxn, ndx, spx, spread],
  )

  const explained = [vix, vxn, ndx, spx].filter((q): q is Quote => q !== null)

  const status = marketStatusAt(now)
  const isDemo = snapshot?.isDemo ?? false
  const lastUpdated = snapshot ? formatInZone(snapshot.fetchedAt, SG_TZ) : null
  // The feed's own timestamp, distinct from when this app last polled.
  const dataTimestamp = useMemo(() => {
    const stamps = explained.map((q) => q.timestamp)
    return stamps.length > 0 ? formatInZone(Math.max(...stamps), SG_TZ) : null
  }, [explained])

  return (
    <div className="mx-auto max-w-[1760px] px-4 py-4 sm:px-6 lg:px-8">
      <Header
        status={status}
        nowSGT={formatInZone(now, SG_TZ)}
        lastUpdated={lastUpdated}
        dataTimestamp={dataTimestamp}
        providerId={providerId}
        providerName={snapshot?.providerName ?? getProvider(providerId).name}
        isDemo={isDemo}
        isLoading={loadState === 'loading'}
        autoRefresh={autoRefresh}
        isDark={isDark}
        onRefresh={refresh}
        onProviderChange={setProviderId}
        onAutoRefreshChange={setAutoRefresh}
        onThemeToggle={() => setIsDark((v) => !v)}
      />

      {error && (
        <div
          role="status"
          className="mt-3 rounded-md border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200"
        >
          <span className="font-medium">Data unavailable</span> — {error}.{' '}
          {snapshot
            ? `Showing the last successfully retrieved data from ${lastUpdated} (SGT). No values have been substituted.`
            : 'Nothing has been retrieved yet. Switch the source to Demo above if you want to explore the interface with clearly-labelled synthetic data.'}
        </div>
      )}

      {isStale && !error && snapshot && (
        <div className="mt-3 text-2xs text-neutral-500 dark:text-neutral-400">
          Restored from local cache — press Refresh for current values.
        </div>
      )}

      <main className="mt-4 space-y-4">
        {/* Volatility first: the two questions the panel exists to answer. */}
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {vix ? (
            <VolatilityCard quote={vix} tooltip={VIX_TOOLTIP} />
          ) : (
            <Unavailable
              title="VIX"
              subtitle="S&P 500 expected volatility"
              message={errorOf(snapshot, 'VIX') ?? 'Data unavailable.'}
              lastGood={lastUpdated}
            />
          )}
          {vxn ? (
            <VolatilityCard quote={vxn} tooltip={VXN_TOOLTIP} />
          ) : (
            <Unavailable
              title="VXN"
              subtitle="Nasdaq-100 expected volatility"
              message={errorOf(snapshot, 'VXN') ?? 'Data unavailable.'}
              lastGood={lastUpdated}
            />
          )}
        </section>

        {/* Price is kept visually separate from volatility, by design. */}
        <section>
          <h2 className="label mb-2">Price — realised, directional</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {ndx ? (
              <IndexCard quote={ndx} />
            ) : (
              <Unavailable title="Nasdaq-100" message={errorOf(snapshot, 'NDX') ?? undefined} />
            )}
            {qqq ? (
              <IndexCard quote={qqq} />
            ) : (
              <Unavailable title="Invesco QQQ Trust" message={errorOf(snapshot, 'QQQ') ?? undefined} />
            )}
            {spx ? (
              <IndexCard quote={spx} />
            ) : (
              <Unavailable title="S&P 500" message={errorOf(snapshot, 'SPX') ?? undefined} />
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-[1.6fr_1fr]">
          <DirectionMatrix ndx={ndx} vxn={vxn} active={quadrant} />
          <SpreadPanel spread={spread} />
        </section>

        <ChartsSection
          vix={vix}
          vxn={vxn}
          ndx={ndx}
          range={range}
          onRangeChange={setRange}
          isDark={isDark}
        />

        <Observation lines={observation} isDemo={isDemo} />

        <LearningMode quotes={explained} open={learningOpen} onToggle={setLearningOpen} />
      </main>

      <footer className="mt-6 border-t hairline pt-3 text-2xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        Regime bands are a reference reading aid, not financial rules. VIX and VXN measure
        expected volatility and are not directional indicators. This is a personal observation
        and learning tool — it produces no trading recommendations.
      </footer>
    </div>
  )
}
