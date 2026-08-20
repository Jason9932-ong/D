/**
 * Shown in place of a value when an instrument could not be retrieved.
 * Never falls back to a placeholder number.
 */
export function Unavailable({
  title,
  subtitle,
  message,
  lastGood,
}: {
  title: string
  subtitle?: string
  message?: string
  lastGood?: string | null
}) {
  return (
    <div className="card flex flex-col border-dashed">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold tracking-wide">{title}</span>
        {subtitle && <span className="label">{subtitle}</span>}
      </div>
      <div className="mt-3 text-2xl font-light text-neutral-400 dark:text-neutral-500">
        Unavailable
      </div>
      <p className="mt-2 text-2xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        {message ?? 'Data unavailable.'}
        {lastGood && (
          <>
            <br />
            Last successful retrieval: <span className="tnum">{lastGood}</span>
          </>
        )}
      </p>
    </div>
  )
}
