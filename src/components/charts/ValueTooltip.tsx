import type { TooltipProps } from 'recharts'
import { formatPercent, formatSigned, formatValue } from '../../lib/format'
import type { ChartTheme } from './chartTheme'

interface Row {
  name: string
  value: number
  change: number | null
  changePercent: number | null
  color: string
}

/**
 * Hover readout: date, value, and the daily change for each series in view.
 * Rendered manually rather than via Recharts defaults so the layout stays
 * compact and the numbers stay tabular.
 */
export function ValueTooltip({
  active,
  payload,
  label,
  theme,
  precision = 2,
}: TooltipProps<number, string> & { theme: ChartTheme; precision?: number }) {
  if (!active || !payload || payload.length === 0) return null

  const rows: Row[] = payload
    .filter((p) => typeof p.value === 'number')
    .map((p) => {
      const point = p.payload as Record<string, unknown>
      const key = String(p.dataKey)
      return {
        name: p.name ?? key,
        value: p.value as number,
        change: (point[`${key}Change`] as number | null) ?? null,
        changePercent: (point[`${key}ChangePercent`] as number | null) ?? null,
        color: p.color ?? theme.tooltipText,
      }
    })

  if (rows.length === 0) return null

  return (
    <div
      className="tnum rounded border px-2.5 py-2 text-xs shadow-sm"
      style={{
        backgroundColor: theme.tooltipBg,
        borderColor: theme.tooltipBorder,
        color: theme.tooltipText,
      }}
    >
      <div style={{ color: theme.tooltipMuted }} className="text-2xs">
        {String(label)}
      </div>
      {rows.map((row) => (
        <div key={row.name} className="mt-1 flex items-baseline gap-2">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: row.color }}
          />
          <span style={{ color: theme.tooltipMuted }}>{row.name}</span>
          <span className="ml-auto font-medium">{formatValue(row.value, precision)}</span>
          <span style={{ color: theme.tooltipMuted }}>
            {row.change === null
              ? '—'
              : `${formatSigned(row.change, precision)} (${formatPercent(row.changePercent ?? 0)})`}
          </span>
        </div>
      ))}
    </div>
  )
}
