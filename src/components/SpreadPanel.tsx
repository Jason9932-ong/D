import type { Spread } from '../data/marketData'
import { formatSigned, formatValue } from '../lib/format'

/** VXN − VIX and VXN / VIX, with a one-line reading of what the gap means. */
export function SpreadPanel({ spread }: { spread: Spread | null }) {
  return (
    <section className="card">
      <h2 className="text-sm font-semibold tracking-wide">VIX vs VXN</h2>

      {!spread ? (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          Unavailable — both VIX and VXN are required to compute the spread.
        </p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <dt className="label">VIX</dt>
              <dd className="tnum mt-0.5 text-xl font-light">{formatValue(spread.vix)}</dd>
            </div>
            <div>
              <dt className="label">VXN</dt>
              <dd className="tnum mt-0.5 text-xl font-light">{formatValue(spread.vxn)}</dd>
            </div>
            <div className="border-t hairline pt-2.5">
              <dt className="label">Spread (VXN − VIX)</dt>
              <dd className="tnum mt-0.5 text-xl font-light">
                {formatSigned(spread.difference)}
              </dd>
            </div>
            <div className="border-t hairline pt-2.5">
              <dt className="label">Ratio (VXN / VIX)</dt>
              <dd className="tnum mt-0.5 text-xl font-light">
                {formatValue(spread.ratio)}
              </dd>
            </div>
          </dl>

          <p className="mt-3 border-t hairline pt-2.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
            {Math.abs(spread.difference) < 0.05
              ? 'Nasdaq-100 and S&P 500 options are pricing similar expected volatility.'
              : spread.difference > 0
                ? 'Nasdaq-100 options are pricing higher expected volatility than the broader S&P 500.'
                : 'S&P 500 options are pricing higher expected volatility than the Nasdaq-100.'}
          </p>
        </>
      )}
    </section>
  )
}
