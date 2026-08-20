/** Chart colours kept in one place so all four charts stay visually consistent. */
export interface ChartTheme {
  axis: string
  grid: string
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  tooltipMuted: string
}

export function chartTheme(isDark: boolean): ChartTheme {
  return isDark
    ? {
        axis: '#6b7280',
        grid: '#27272a',
        tooltipBg: '#18181b',
        tooltipBorder: '#3f3f46',
        tooltipText: '#f4f4f5',
        tooltipMuted: '#a1a1aa',
      }
    : {
        axis: '#9ca3af',
        grid: '#eeeeef',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e5e5e5',
        tooltipText: '#171717',
        tooltipMuted: '#737373',
      }
}

/** Series strokes. Muted and distinguishable without relying on hue alone. */
export const SERIES_COLOR = {
  vix: '#5b7f9e',
  vxn: '#b0763f',
  price: '#5f7a63',
} as const
