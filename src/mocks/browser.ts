/**
 * MSW browser worker setup.
 * Import and call `startMockServiceWorker()` from main.tsx.
 */
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/**
 * Starts the MSW Service Worker in the browser.
 * In CI / production builds, this is a no-op (MSW is devDependency only).
 */
export async function startMockServiceWorker(): Promise<void> {
  await worker.start({
    onUnhandledRequest: 'bypass', // Don't warn on CDN/asset requests
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}
