import { QUADRANTS, type Quadrant } from '../data/marketData'
import type { Quote } from '../data/types'
import { formatPercent } from '../lib/format'
import { InfoTip } from './InfoTip'

/**
 * 2×2 observation framework: Nasdaq-100 price direction against VXN direction.
 *
 * The highlighted cell is a description of what happened today. It is not a
 * prediction, and the panel says so on screen.
 */
export function DirectionMatrix({
  ndx,
  vxn,
  active,
}: {
  ndx: Quote | null
  vxn: Quote | null
  active: Quadrant | null
}) {
  return (
    <section className="card">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold tracking-wide">Direction Matrix</h2>
          <InfoTip text="An observation framework, not a prediction. It records how the Nasdaq-100 and expected Nasdaq-100 volatility moved together today." />
        </div>
        <span className="label">Nasdaq-100 × VXN</span>
      </header>

      {active ? (
        <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">
          <span className="font-medium">{active.title}</span>
          <span className="text-neutral-500 dark:text-neutral-400"> — {active.interpretation}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {ndx && vxn
            ? 'One or both readings are essentially unchanged, so no quadrant applies today.'
            : 'Nasdaq-100 or VXN data is unavailable, so no quadrant can be determined.'}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {QUADRANTS.map((q) => {
          const isActive = active?.id === q.id
          return (
            <div
              key={q.id}
              aria-current={isActive || undefined}
              className={[
                'rounded border p-3 transition-colors',
                isActive
                  ? 'border-neutral-800 bg-neutral-50 dark:border-neutral-300 dark:bg-neutral-800/60'
                  : 'border-neutral-200 dark:border-neutral-800',
              ].join(' ')}
            >
              <div
                className={[
                  'text-2xs font-medium uppercase tracking-[0.1em]',
                  isActive
                    ? 'text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-500 dark:text-neutral-400',
                ].join(' ')}
              >
                Nasdaq {q.priceDirection === 'up' ? '↑' : '↓'} + VXN{' '}
                {q.volDirection === 'up' ? '↑' : '↓'}
              </div>
              <div
                className={[
                  'mt-1.5 text-sm',
                  isActive
                    ? 'font-medium text-neutral-900 dark:text-neutral-100'
                    : 'text-neutral-600 dark:text-neutral-300',
                ].join(' ')}
              >
                {q.title}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                {q.interpretation}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t hairline pt-2.5 text-2xs text-neutral-500 dark:text-neutral-400">
        {ndx && (
          <span className="tnum">
            Nasdaq-100 {formatPercent(ndx.changePercent)}
          </span>
        )}
        {vxn && <span className="tnum">VXN {formatPercent(vxn.changePercent)}</span>}
        <span>Observation only — none of these combinations predicts what happens next.</span>
      </div>
    </section>
  )
}
