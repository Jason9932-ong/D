/** Number formatting helpers shared across the dashboard. */

export function formatValue(value: number, precision = 2): string {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })
}

/** Always carries an explicit sign, so a change reads unambiguously. */
export function formatSigned(value: number, precision = 2): string {
  if (!Number.isFinite(value)) return '—'
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}`
}

export function formatPercent(value: number, precision = 2): string {
  if (!Number.isFinite(value)) return '—'
  return `${formatSigned(value, precision)}%`
}

/** `2026-08-20` → `20 Aug` for compact chart axes. */
export function shortDate(iso: string): string {
  const [, month, day] = iso.split('-')
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  const index = Number(month) - 1
  if (Number.isNaN(index) || !months[index]) return iso
  return `${Number(day)} ${months[index]}`
}
