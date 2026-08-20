import { explainPrice, explainVolatility } from '../data/observation'
import { formatPercent, formatValue } from '../lib/format'
import type { Quote } from '../data/types'

/**
 * Optional expandable panel: what each of today's readings means, in plain
 * language, with the direction/volatility distinction restated each time.
 */
export function LearningMode({
  quotes,
  open,
  onToggle,
}: {
  quotes: Quote[]
  open: boolean
  onToggle: (next: boolean) => void
}) {
  return (
    <section className="card">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onToggle(!open)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-semibold tracking-wide">
          What does today&rsquo;s data mean?
        </span>
        <span className="flex items-center gap-2 text-2xs uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
          Learning mode
          <span aria-hidden className="text-sm leading-none">
            {open ? '−' : '+'}
          </span>
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t hairline pt-3">
          {quotes.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Data unavailable — nothing to explain yet.
            </p>
          )}
          {quotes.map((quote) => (
            <div key={quote.symbol} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
              <div className="tnum">
                <div className="text-sm font-medium">
                  {quote.symbol}: {formatValue(quote.current)}
                </div>
                <div className="text-2xs text-neutral-500 dark:text-neutral-400">
                  Change: {formatPercent(quote.changePercent)}
                </div>
              </div>
              <p className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                {quote.kind === 'volatility' ? explainVolatility(quote) : explainPrice(quote)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
