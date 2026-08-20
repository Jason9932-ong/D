/** Today's Observation — factual sentences generated from the data on screen. */
export function Observation({ lines, isDemo }: { lines: string[]; isDemo: boolean }) {
  return (
    <section className="card">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide">Today&rsquo;s Observation</h2>
        <span className="label">Generated from the data above</span>
      </div>

      {lines.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          Data unavailable — no observation can be generated.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {lines.map((line) => (
            <li
              key={line}
              className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-200"
            >
              {line}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 border-t hairline pt-2.5 text-2xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        {isDemo && (
          <span className="font-medium text-neutral-600 dark:text-neutral-300">
            Based on demo data.{' '}
          </span>
        )}
        This is a description of observed values only. It is not financial advice and contains
        no trading recommendation.
      </p>
    </section>
  )
}
