import { sliceRange } from '../data/marketData'
import type { Quote, RangeKey } from '../data/types'
import { SeriesChart } from './charts/SeriesChart'
import { SERIES_COLOR, chartTheme } from './charts/chartTheme'
import { RangeSwitch } from './RangeSwitch'

/**
 * Four charts: VIX, VXN, Nasdaq-100, and VIX against VXN.
 *
 * All four share one range switch; the underlying series is fetched once for a
 * year and sliced locally, so switching windows is instant and costs no request.
 */
export function ChartsSection({
  vix,
  vxn,
  ndx,
  range,
  onRangeChange,
  isDark,
}: {
  vix: Quote | null
  vxn: Quote | null
  ndx: Quote | null
  range: RangeKey
  onRangeChange: (next: RangeKey) => void
  isDark: boolean
}) {
  const theme = chartTheme(isDark)
  const vixPoints = vix ? sliceRange(vix.historical, range) : []
  const vxnPoints = vxn ? sliceRange(vxn.historical, range) : []
  const ndxPoints = ndx ? sliceRange(ndx.historical, range) : []

  return (
    <section>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide">Historical Charts</h2>
        <RangeSwitch value={range} onChange={onRangeChange} />
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SeriesChart
          title="VIX"
          subtitle={range}
          theme={theme}
          series={[
            { key: 'vix', label: 'VIX', color: SERIES_COLOR.vix, points: vixPoints },
          ]}
        />
        <SeriesChart
          title="VXN"
          subtitle={range}
          theme={theme}
          series={[
            { key: 'vxn', label: 'VXN', color: SERIES_COLOR.vxn, points: vxnPoints },
          ]}
        />
        <SeriesChart
          title="Nasdaq-100"
          subtitle={range}
          theme={theme}
          series={[
            { key: 'ndx', label: 'NDX', color: SERIES_COLOR.price, points: ndxPoints },
          ]}
        />
        <SeriesChart
          title="VIX vs VXN"
          theme={theme}
          series={[
            { key: 'vix', label: 'VIX', color: SERIES_COLOR.vix, points: vixPoints },
            { key: 'vxn', label: 'VXN', color: SERIES_COLOR.vxn, points: vxnPoints },
          ]}
        />
      </div>
    </section>
  )
}
