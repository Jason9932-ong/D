/**
 * US market session state, derived from New York wall-clock time.
 *
 * Sessions (Eastern):
 *   pre-market  04:00 – 09:30
 *   open        09:30 – 16:00
 *   after-hours 16:00 – 20:00
 *   closed      otherwise, plus weekends and full-day holidays
 *
 * The dashboard shows this state alongside Singapore local time, and separately
 * shows the timestamp that came with the market data itself.
 */

export type MarketStatus = 'OPEN' | 'PRE-MARKET' | 'AFTER-HOURS' | 'CLOSED'

export const NY_TZ = 'America/New_York'
export const SG_TZ = 'Asia/Singapore'

/**
 * Full-day US equity-market holidays. Half-days (early closes) are not modelled
 * — the status is a display aid, not a trading gate. Extend as needed.
 */
const HOLIDAYS = new Set([
  '2025-01-01', '2025-01-09', '2025-01-20', '2025-02-17', '2025-04-18',
  '2025-05-26', '2025-06-19', '2025-07-04', '2025-09-01', '2025-11-27', '2025-12-25',
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
  '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
  '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
])

interface ZonedParts {
  date: string
  weekday: number
  minutes: number
}

/** Break a moment down into date / weekday / minutes-past-midnight in a zone. */
function partsIn(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  })
  const parts = fmt.formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  // `hour` can come back as "24" at midnight in some environments.
  const hour = Number(get('hour')) % 24
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: weekdays.indexOf(get('weekday')),
    minutes: hour * 60 + Number(get('minute')),
  }
}

export function marketStatusAt(now: Date = new Date()): MarketStatus {
  const { date, weekday, minutes } = partsIn(now, NY_TZ)
  if (weekday === 0 || weekday === 6) return 'CLOSED'
  if (HOLIDAYS.has(date)) return 'CLOSED'
  if (minutes >= 9 * 60 + 30 && minutes < 16 * 60) return 'OPEN'
  if (minutes >= 4 * 60 && minutes < 9 * 60 + 30) return 'PRE-MARKET'
  if (minutes >= 16 * 60 && minutes < 20 * 60) return 'AFTER-HOURS'
  return 'CLOSED'
}

/** `true` only during the regular session — used to decide whether to auto-refresh. */
export function isRegularSession(now: Date = new Date()): boolean {
  return marketStatusAt(now) === 'OPEN'
}

export function formatInZone(
  value: number | Date,
  timeZone: string,
  withSeconds = true,
): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' as const } : {}),
    hour12: false,
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  const hour = String(Number(get('hour')) % 24).padStart(2, '0')
  const time = withSeconds
    ? `${hour}:${get('minute')}:${get('second')}`
    : `${hour}:${get('minute')}`
  return `${get('year')}-${get('month')}-${get('day')} ${time}`
}
