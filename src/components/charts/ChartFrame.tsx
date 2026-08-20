import type { ReactNode } from 'react'

/** Shared shell so all four charts line up and share one heading rhythm. */
export function ChartFrame({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
}) {
  return (
    <figure className="card m-0">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold tracking-wide">{title}</span>
        {subtitle && (
          <span className="text-2xs text-neutral-500 dark:text-neutral-400">{subtitle}</span>
        )}
      </figcaption>
      <div className="mt-3 h-40 sm:h-44">{children}</div>
    </figure>
  )
}
