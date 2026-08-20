import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { HistoricalPoint } from '../../data/types'
import { shortDate } from '../../lib/format'
import { ChartFrame } from './ChartFrame'
import { ValueTooltip } from './ValueTooltip'
import type { ChartTheme } from './chartTheme'

export interface Series {
  /** Key used in the merged row objects; also the tooltip label. */
  key: string
  label: string
  color: string
  points: HistoricalPoint[]
}

interface Row {
  date: string
  labelDate: string
  [key: string]: string | number | null
}

/**
 * Minimal line chart for one or two series.
 *
 * Deliberately plain: no gradients, no shadows, no animation, one faint
 * horizontal grid, and axis ticks thinned so labels never collide.
 */
export function SeriesChart({
  title,
  subtitle,
  series,
  theme,
  precision = 2,
}: {
  title: string
  subtitle?: string
  series: Series[]
  theme: ChartTheme
  precision?: number
}) {
  const rows = useMemo<Row[]>(() => {
    // Union of dates across series, so a gap in one does not drop a whole row.
    const byDate = new Map<string, Row>()
    for (const s of series) {
      for (const point of s.points) {
        const row =
          byDate.get(point.date) ?? ({ date: point.date, labelDate: shortDate(point.date) } as Row)
        row[s.key] = point.close
        row[`${s.key}Change`] = point.change
        row[`${s.key}ChangePercent`] = point.changePercent
        byDate.set(point.date, row)
      }
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [series])

  const hasData = rows.length >= 2

  // Reserve y-axis width by magnitude so index levels are never clipped.
  const peak = Math.max(
    0,
    ...series.flatMap((s) => s.points.map((p) => Math.abs(p.close))),
  )
  const axisWidth = peak >= 10000 ? 56 : peak >= 1000 ? 48 : 36

  return (
    <ChartFrame
      title={title}
      subtitle={
        series.length > 1 ? (
          <span className="flex items-center gap-3">
            {series.map((s) => (
              <span key={s.key} className="flex items-center gap-1">
                <span
                  aria-hidden
                  className="inline-block h-0.5 w-3"
                  style={{ backgroundColor: s.color }}
                />
                {s.label}
              </span>
            ))}
          </span>
        ) : (
          subtitle
        )
      }
    >
      {!hasData ? (
        <div className="flex h-full items-center justify-center text-xs text-neutral-400 dark:text-neutral-500">
          Data unavailable
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} strokeWidth={1} />
            <XAxis
              dataKey="labelDate"
              tick={{ fill: theme.axis, fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: theme.grid }}
              interval="preserveStartEnd"
              minTickGap={26}
            />
            <YAxis
              tick={{ fill: theme.axis, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={axisWidth}
              domain={['auto', 'auto']}
              tickFormatter={(v: number) =>
                Math.abs(v) >= 1000
                  ? v.toLocaleString('en-US', { maximumFractionDigits: 0 })
                  : v.toFixed(1)
              }
            />
            <Tooltip
              cursor={{ stroke: theme.axis, strokeWidth: 1, strokeDasharray: '3 3' }}
              content={<ValueTooltip theme={theme} precision={precision} />}
            />
            {series.map((s) => (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  )
}
