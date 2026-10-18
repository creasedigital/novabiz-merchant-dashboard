import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

/**
 * Bootstrap the MSW mock service worker before mounting React.
 * In a real production build the worker file would not exist, so
 * startMockServiceWorker() resolves instantly (no-op in prod mode).
 */
async function prepare(): Promise<void> {
  if (import.meta.env.DEV) {
    const { startMockServiceWorker } = await import('./mocks/browser')
    await startMockServiceWorker()
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found in DOM')
}

prepare().then(() => {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
