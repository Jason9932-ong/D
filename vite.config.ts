import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * The Yahoo Finance chart endpoint does not send CORS headers, so the browser
 * cannot call it directly. The dev/preview server proxies `/api/yahoo/*` to it,
 * which keeps the whole application local (no backend, no database, no API key).
 *
 * To swap in a different upstream later, change this proxy target and add a new
 * provider under src/data/providers/ — the UI never talks to a provider directly.
 */
const yahooProxy = {
  '/api/yahoo': {
    target: 'https://query1.finance.yahoo.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/yahoo/, ''),
    headers: {
      // Yahoo rejects requests without a browser-like User-Agent.
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      Accept: 'application/json',
    },
  },
}

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: yahooProxy },
  preview: { port: 4173, proxy: yahooProxy },
})
