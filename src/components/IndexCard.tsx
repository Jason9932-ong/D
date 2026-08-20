import { DIRECTION_ARROW, directionOf } from '../data/marketData'
import type { Quote } from '../data/types'
import { formatPercent, formatSigned, formatValue } from '../lib/format'

/**
 * Readout for a price index.
 *
 * Price is a realised, directional quantity, so a muted up/down tone is
 * meaningful here — unlike the volatility cards, which are coloured by regime.
 * The tones stay desaturated so they never dominate the panel.
 */
export function IndexCard({ quote }: { quote: Quote }) {
  const direction = directionOf(quote.change, 0.005)
  const tone =
    direction === 'up'
      ? 'text-emerald-700 dark:text-emerald-400'
      : direction === 'down'
        ? 'text-rose-700 dark:text-rose-400'
        : 'text-neutral-500 dark:text-neutral-400'

  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-wide">{quote.displayName}</h3>
        <span className="label">{quote.vendorSymbol}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-3">
        <span className="tnum text-3xl font-light leading-none">
          {formatValue(quote.current)}
        </span>
        <span className={`tnum text-base ${tone}`}>
          {DIRECTION_ARROW[direction]} {formatPercent(quote.changePercent)}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 border-t hairline pt-2.5">
        <div>
          <dt className="label">Prev close</dt>
          <dd className="tnum mt-0.5 text-sm">{formatValue(quote.previousClose)}</dd>
        </div>
        <div>
          <dt className="label">Daily change</dt>
          <dd className={`tnum mt-0.5 text-sm ${tone}`}>{formatSigned(quote.change)}</dd>
        </div>
      </dl>
    </div>
  )
}
