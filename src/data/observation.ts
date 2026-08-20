import { directionOf, type Spread } from './marketData'
import { regimeFor } from './regime'
import type { Quote } from './types'

/**
 * Factual daily summary built only from the numbers on screen.
 *
 * Constraints, deliberately hard-coded into the sentence templates:
 *   - describes what changed, never what to do;
 *   - no BUY / SELL / LONG / SHORT, no forecast of direction;
 *   - never claims a causal link between volatility and price.
 */

const move = (q: Quote) => directionOf(q.changePercent, 0.01)

function verb(q: Quote): string {
  const d = move(q)
  return d === 'up' ? 'increased' : d === 'down' ? 'declined' : 'was little changed'
}

function pct(q: Quote): string {
  return `${Math.abs(q.changePercent).toFixed(2)}%`
}

function num(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export interface ObservationInput {
  vix: Quote | null
  vxn: Quote | null
  ndx: Quote | null
  spx: Quote | null
  spread: Spread | null
}

/** Returns an array of short factual sentences, or an empty array if no data. */
export function buildObservation({
  vix,
  vxn,
  ndx,
  spx,
  spread,
}: ObservationInput): string[] {
  const lines: string[] = []

  // 1. Volatility levels and moves.
  if (vix) {
    const d = move(vix)
    lines.push(
      d === 'flat'
        ? `VIX is little changed at ${num(vix.current)}, in the ${regimeFor(vix.current).label.toLowerCase()} reference regime.`
        : `VIX ${verb(vix)} ${pct(vix)}, from ${num(vix.previousClose)} to ${num(vix.current)}, in the ${regimeFor(vix.current).label.toLowerCase()} reference regime.`,
    )
  }
  if (vxn) {
    const d = move(vxn)
    lines.push(
      d === 'flat'
        ? `VXN is little changed at ${num(vxn.current)}, in the ${regimeFor(vxn.current).label.toLowerCase()} reference regime.`
        : `VXN ${verb(vxn)} ${pct(vxn)}, from ${num(vxn.previousClose)} to ${num(vxn.current)}, in the ${regimeFor(vxn.current).label.toLowerCase()} reference regime.`,
    )
  }

  // 2. Index moves.
  const indexParts: string[] = []
  if (ndx) indexParts.push(`the Nasdaq-100 ${verb(ndx)}${move(ndx) === 'flat' ? '' : ` ${pct(ndx)}`}`)
  if (spx) indexParts.push(`the S&P 500 ${verb(spx)}${move(spx) === 'flat' ? '' : ` ${pct(spx)}`}`)
  if (indexParts.length > 0) {
    lines.push(`Over the same session, ${indexParts.join(' and ')}.`)
  }

  // 3. The combination — stated as a co-occurrence, not a cause.
  if (ndx && vxn) {
    const price = move(ndx)
    const vol = move(vxn)
    if (price !== 'flat' && vol !== 'flat') {
      const priceWord = price === 'up' ? 'rose' : 'declined'
      const volWord = vol === 'up' ? 'increased' : 'decreased'
      const together = (price === 'up') === (vol === 'up')
      lines.push(
        `The Nasdaq-100 ${priceWord} and expected Nasdaq-100 volatility ${volWord} — they moved ${
          together ? 'in the same direction' : 'in opposite directions'
        } today. This records what happened together; it does not mean one caused the other, or that it continues.`,
      )
    }
  }

  // 4. Cross-index volatility spread.
  if (spread) {
    const higher = spread.difference > 0 ? 'Nasdaq-100' : 'S&P 500'
    const lower = spread.difference > 0 ? 'S&P 500' : 'Nasdaq-100'
    if (Math.abs(spread.difference) < 0.05) {
      lines.push(
        `VXN and VIX are close together (spread ${spread.difference.toFixed(2)}), so both indices are pricing similar expected volatility.`,
      )
    } else {
      lines.push(
        `The VXN − VIX spread is ${spread.difference > 0 ? '+' : '−'}${Math.abs(spread.difference).toFixed(2)} (ratio ${spread.ratio.toFixed(2)}), meaning ${higher} options are pricing higher expected volatility than ${lower} options.`,
      )
    }
  }

  return lines
}

/** Per-instrument plain-language notes for the expandable Learning Mode panel. */
export function explainVolatility(quote: Quote): string {
  const d = move(quote)
  const index = quote.symbol === 'VXN' ? 'Nasdaq-100' : 'S&P 500'
  if (d === 'flat') {
    return `Expected volatility for the ${index} is roughly unchanged from the previous close. Options are pricing a similar size of future move as they were yesterday. This does not indicate whether the ${index} will rise or fall.`
  }
  const word = d === 'up' ? 'increased' : 'decreased'
  const consequence =
    d === 'up'
      ? `Options are pricing larger moves over the coming period than they were at the previous close.`
      : `Options are pricing smaller moves over the coming period than they were at the previous close.`
  return `Expected volatility for the ${index} has ${word} compared with the previous close. ${consequence} This does not indicate whether the ${index} will rise or fall.`
}

export function explainPrice(quote: Quote): string {
  const d = move(quote)
  if (d === 'flat') {
    return `${quote.displayName} is close to its previous close of ${num(quote.previousClose)}. This is a realised price move that has already happened, separate from the expected volatility shown above.`
  }
  const word = d === 'up' ? 'higher' : 'lower'
  return `${quote.displayName} is ${Math.abs(quote.changePercent).toFixed(2)}% ${word} than its previous close of ${num(quote.previousClose)}. This is a realised price move that has already happened, separate from the expected volatility shown above.`
}
