/**
 * Reference volatility regimes.
 *
 * These bands are a visual reading aid, not a financial rule. They are always
 * presented under the label "Reference Regime" in the UI.
 *
 * Colour follows the risk interpretation of the LEVEL (§ colour logic), never
 * the direction of the last move: a falling VXN at 38 is still "Very High".
 */

export type RegimeId = 'very-low' | 'low' | 'moderate' | 'high' | 'very-high' | 'extreme'

export interface Regime {
  id: RegimeId
  label: string
  /** Inclusive lower bound. */
  min: number
  /** Exclusive upper bound; `Infinity` for the top band. */
  max: number
  /** Tailwind classes for the regime chip. */
  chipClass: string
  /** Solid colour used for chart strokes and accent rules. */
  accent: string
  description: string
}

/** Identical bands are used for VIX and VXN. */
export const REGIMES: Regime[] = [
  {
    id: 'very-low',
    label: 'VERY LOW',
    min: -Infinity,
    max: 15,
    chipClass:
      'bg-slate-500/10 text-slate-600 ring-slate-500/25 dark:text-slate-300 dark:bg-slate-400/10',
    accent: '#64748b',
    description: 'Options are pricing a quiet period ahead.',
  },
  {
    id: 'low',
    label: 'LOW',
    min: 15,
    max: 20,
    chipClass:
      'bg-teal-600/10 text-teal-700 ring-teal-600/25 dark:text-teal-300 dark:bg-teal-400/10',
    accent: '#5b8a8a',
    description: 'Expected volatility is below its typical range.',
  },
  {
    id: 'moderate',
    label: 'MODERATE',
    min: 20,
    max: 25,
    chipClass:
      'bg-amber-600/10 text-amber-700 ring-amber-600/25 dark:text-amber-300 dark:bg-amber-400/10',
    accent: '#b08a4a',
    description: 'Expected volatility is around its typical range.',
  },
  {
    id: 'high',
    label: 'HIGH',
    min: 25,
    max: 30,
    chipClass:
      'bg-orange-600/10 text-orange-700 ring-orange-600/25 dark:text-orange-300 dark:bg-orange-400/10',
    accent: '#b5713c',
    description: 'Options are pricing larger moves than usual.',
  },
  {
    id: 'very-high',
    label: 'VERY HIGH',
    min: 30,
    max: 40,
    chipClass:
      'bg-red-700/10 text-red-700 ring-red-700/25 dark:text-red-300 dark:bg-red-400/10',
    accent: '#a9543d',
    description: 'Expected volatility is well above its typical range.',
  },
  {
    id: 'extreme',
    label: 'EXTREME',
    min: 40,
    max: Infinity,
    chipClass:
      'bg-red-900/15 text-red-800 ring-red-800/35 dark:text-red-200 dark:bg-red-500/15',
    accent: '#96393a',
    description: 'Options are pricing exceptionally large moves.',
  },
]

export function regimeFor(value: number): Regime {
  return REGIMES.find((r) => value >= r.min && value < r.max) ?? REGIMES[REGIMES.length - 1]
}
