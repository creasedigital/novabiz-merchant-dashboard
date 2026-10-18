import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers, resetIdempotencyStore } from '@/mocks/handlers'
import { resetMockDb } from '@/mocks/db'

// ---------------------------------------------------------------------------
// JSDOM Polyfills for Radix UI / Shadcn Primitives
// ---------------------------------------------------------------------------

// 1. ResizeObserver Polyfill
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// 2. HTMLElement Pointer Capture & Scrolling Polyfills
if (typeof window !== 'undefined' && window.HTMLElement) {
  window.HTMLElement.prototype.scrollIntoView = () => {}
  window.HTMLElement.prototype.hasPointerCapture = () => false
  window.HTMLElement.prototype.setPointerCapture = () => {}
  window.HTMLElement.prototype.releasePointerCapture = () => {}
}

// 3. matchMedia Polyfill
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// ---------------------------------------------------------------------------
// MSW Node Server for Integration & Unit Tests
// ---------------------------------------------------------------------------

export const server = setupServer(...handlers)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
})

afterEach(() => {
  server.resetHandlers()
  resetMockDb()
  resetIdempotencyStore()
})

afterAll(() => {
  server.close()
})
