/**
 * TanStack QueryClient Configuration
 *
 * Configured with exponential backoff retry strategy for Nigerian low-connectivity
 * resilience:
 * - Exponential backoff: `Math.min(1000 * 2 ** attempt, 8000)`
 * - Skips retries on 4xx validation or client errors (e.g. 400, 401, 403, 422)
 * - Retries transient network/5xx server errors up to 3 times
 */
import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api'

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    // 4xx errors are deterministic client errors (e.g. invalid NUBAN, insufficient funds)
    // Never retry 4xx
    if (error.status >= 400 && error.status < 500) {
      return false
    }
  }
  // Retry network failures (status 0) and 5xx up to 3 times
  return failureCount < 3
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false, // mutations manage their own idempotency and rollback
    },
  },
})
