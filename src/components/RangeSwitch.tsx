import { RANGE_DAYS, type RangeKey } from '../data/types'

const RANGES = Object.keys(RANGE_DAYS) as RangeKey[]

export function RangeSwitch({
  value,
  onChange,
}: {
  value: RangeKey
  onChange: (next: RangeKey) => void
}) {
  return (
    <div
      role="group"
      aria-label="Chart range"
      className="inline-flex overflow-hidden rounded border border-neutral-200 dark:border-neutral-800"
    >
      {RANGES.map((range) => (
        <button
          key={range}
          type="button"
          aria-pressed={value === range}
          onClick={() => onChange(range)}
          className={[
            'px-2.5 py-1 text-2xs font-medium tracking-wider transition-colors',
            'border-r border-neutral-200 last:border-r-0 dark:border-neutral-800',
            value === range
              ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
              : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100',
          ].join(' ')}
        >
          {range}
        </button>
      ))}
    </div>
  )
}
