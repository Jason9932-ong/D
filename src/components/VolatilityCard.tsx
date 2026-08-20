import { DIRECTION_ARROW, directionOf } from '../data/marketData'
import { regimeFor } from '../data/regime'
import type { Quote } from '../data/types'
import { formatPercent, formatSigned, formatValue } from '../lib/format'
import { InfoTip } from './InfoTip'

/**
 * Primary readout for a volatility index.
 *
 * Colour comes from the REGIME (the level of expected volatility), not from the
 * sign of today's change — a rising VXN is not automatically "red", and a
 * falling VXN at an extreme level is not automatically "green".
 */
export function VolatilityCard({ quote, tooltip }: { quote: Quote; tooltip: string }) {
  const regime = regimeFor(quote.current)
  const direction = directionOf(quote.change)

  return (
    <div className="card relative overflow-hidden">
      {/* Thin regime rule — the one piece of colour tied to risk level. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ backgroundColor: regime.accent }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold tracking-wide">{quote.symbol}</h2>
          <InfoTip text={tooltip} label={`What ${quote.symbol} measures`} />
        </div>
        <span
          className={`rounded-sm px-1.5 py-0.5 text-2xs font-medium tracking-[0.1em] ring-1 ring-inset ${regime.chipClass}`}
          title="Reference Regime — a reading aid, not a financial rule"
        >
          {regime.label}
        </span>
      </div>

      <p className="mt-0.5 text-2xs text-neutral-500 dark:text-neutral-400">
        {quote.displayName}
      </p>

      <div className="mt-4 flex items-baseline gap-3">
        <span className="tnum text-5xl font-light leading-none">
          {formatValue(quote.current)}
        </span>
        <span
          className="tnum text-lg font-normal text-neutral-500 dark:text-neutral-400"
          aria-label={
            direction === 'up' ? 'higher' : direction === 'down' ? 'lower' : 'unchanged'
          }
        >
          {DIRECTION_ARROW[direction]} {formatSigned(quote.change)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-x-3 gap-y-1 border-t hairline pt-3">
        <div>
          <dt className="label">Prev close</dt>
          <dd className="tnum mt-0.5 text-sm">{formatValue(quote.previousClose)}</dd>
        </div>
        <div>
          <dt className="label">Change</dt>
          <dd className="tnum mt-0.5 text-sm">{formatSigned(quote.change)}</dd>
        </div>
        <div>
          <dt className="label">% Change</dt>
          <dd className="tnum mt-0.5 text-sm">{formatPercent(quote.changePercent)}</dd>
        </div>
      </dl>

      <p className="mt-3 text-2xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        <span className="font-medium text-neutral-600 dark:text-neutral-300">
          Reference Regime:
        </span>{' '}
        {regime.description}
      </p>
    </div>
  )
}
