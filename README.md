# Volatility Panel — VIX / VXN

A local, single-screen dashboard for observing expected-volatility and price data
for the S&P 500 and the Nasdaq-100.

It is a **personal market-volatility observation and learning tool**. It is not a
trading system, it makes no predictions, and it produces no recommendations.

```bash
npm install
npm run dev      # http://localhost:5173
```

No database, no API key, no account.

---

## What it answers

1. What is the current VIX?
2. What is the current VXN?
3. Are VIX and VXN rising or falling?
4. Is the Nasdaq moving in the same or opposite direction to volatility?

The layout keeps **expected volatility** (VIX, VXN) visually separate from
**realised price** (Nasdaq-100, QQQ, S&P 500), because they are different kinds of
quantity. A rising VXN means larger moves are being priced in — in either
direction. It does not mean the Nasdaq-100 will fall.

---

## Data source

**Yahoo Finance chart endpoint** — `query1.finance.yahoo.com/v8/finance/chart/{symbol}`.

| Instrument | Vendor symbol |
| --- | --- |
| VIX — S&P 500 expected volatility | `^VIX` |
| VXN — Nasdaq-100 expected volatility | `^VXN` |
| Nasdaq-100 | `^NDX` |
| Invesco QQQ Trust | `QQQ` |
| S&P 500 | `^GSPC` |

This source carries **both VIX and VXN**, so a separate VXN feed is not required.
Should that change, the provider interface is per-symbol, so a VXN-only adapter
can be registered without touching any UI code.

One year of daily closes is fetched per symbol; the 7D / 30D / 90D / 1Y switches
slice that series locally, so changing the window costs no extra request.

The endpoint sends no CORS headers, so the Vite dev/preview server proxies
`/api/yahoo/*` to it (see `vite.config.ts`). The app stays entirely local — there
is no backend of your own to run.

### Demo provider

`demoProvider` generates synthetic series so the interface is usable offline. It
is **opt-in** via the source selector — it is never substituted automatically for
a failed live fetch — and every snapshot it produces is badged `DEMO DATA` in the
header and flagged in the observation panel.

---

## Architecture

The UI depends on the `MarketDataProvider` interface and the normalised `Quote`
shape. It never imports a vendor response type or calls a provider directly.

```
src/
  data/
    types.ts                       Quote / snapshot shapes, symbol metadata
    marketData.ts                  pure derivations (spread, quadrant, slicing)
    regime.ts                      reference volatility bands
    marketStatus.ts                US session state, Singapore-time formatting
    observation.ts                 factual summary + learning-mode copy
    providers/
      marketDataProvider.ts        the interface every source implements
      yahooProvider.ts             live source
      demoProvider.ts              synthetic source (always badged)
      index.ts                     registry
  hooks/
    useMarketData.ts               fetching, auto-refresh, last-good cache
    useLocalStorage.ts             persisted preferences
  components/                      presentational only
```

Every provider returns:

```ts
{ symbol, vendorSymbol, displayName, kind, timestamp,
  current, previousClose, change, changePercent, historical }
```

To add a source: implement `MarketDataProvider`, register it in
`data/providers/index.ts`, and add an option to the header's source selector.

---

## Data-integrity rules

These are enforced in code, not just by convention:

- **Numbers are never invented.** A symbol that fails to load renders
  `Unavailable`, never a placeholder value.
- **Failures are isolated.** Symbols are fetched with `Promise.allSettled`, so if
  VXN is unavailable while VIX is fine, VIX keeps working and only VXN degrades.
- **A failed refresh keeps the last good data**, labelled with the timestamp of
  its last successful retrieval — it is not presented as current.
- **Demo data is always badged** and never auto-substituted for live data.
- **Auto-refresh pauses outside the regular session**, so a closed market is not
  polled to make stale values look live.
- Two separate timestamps are shown: **Last updated** (when this app last polled)
  and **Data timestamp** (the feed's own timestamp).

## Interpretation rules

- Regime bands are labelled **Reference Regime** and described as a reading aid,
  not a financial rule.
- The Direction Matrix is labelled an observation framework. It describes what
  co-occurred today; it never claims causation or predicts what follows.
- Today's Observation is generated from sentence templates that describe observed
  values only. It contains no BUY / SELL / LONG / SHORT and no forecast.

## Colour logic

Colour encodes **risk interpretation**, not the sign of the last move. The
volatility cards are coloured by regime *level*: a falling VXN at 38 still reads
as VERY HIGH. Muted up/down tones are used only on the price cards, where
direction is the realised quantity being reported.

## Market status

`OPEN` / `PRE-MARKET` / `AFTER-HOURS` / `CLOSED`, derived from New York
wall-clock time with weekends and full-day US market holidays excluded, and
displayed alongside Singapore local time. Half-day early closes are not modelled;
the status is a display aid, not a trading gate.

## Preferences

Chart range, theme, source, auto-refresh and the learning-mode panel persist to
`localStorage`, along with the last successfully retrieved live snapshot.

---

*Not financial advice. VIX and VXN measure expected volatility and are not
directional indicators.*
