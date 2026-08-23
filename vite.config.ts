import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * None of the upstream market-data hosts send CORS headers, so the browser
 * cannot call them directly. The dev/preview server proxies each one, which
 * keeps the whole application local (no backend, no database, no API key).
 *
 * To add another upstream: add a proxy entry here and a provider under
 * src/data/providers/ — the UI never talks to a provider directly.
 */
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const proxy = {
  // Yahoo Finance — intraday quotes for every instrument, but an undocumented
  // endpoint that rate-limits (HTTP 429) requests arriving without cookies.
  '/api/yahoo': {
    target: 'https://query1.finance.yahoo.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/yahoo/, ''),
    headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
  },

  // Yahoo's alternate host, tried when the primary rate-limits.
  '/api/yahoo2': {
    target: 'https://query2.finance.yahoo.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/yahoo2/, ''),
    headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
  },

  // CBOE — the exchange that actually computes VIX and VXN. Official daily
  // OHLC, no key, no rate limiting.
  '/api/cboe': {
    target: 'https://cdn.cboe.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/cboe/, ''),
    headers: { 'User-Agent': BROWSER_UA, Accept: 'text/csv,*/*' },
  },

  // FRED (St. Louis Fed) — official daily closes for the index levels CBOE
  // does not publish.
  '/api/fred': {
    target: 'https://fred.stlouisfed.org',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/fred/, ''),
    headers: { 'User-Agent': BROWSER_UA, Accept: 'text/csv,*/*' },
  },
}

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
})
