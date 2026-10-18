import { describe, it, expect } from 'vitest'
import { shouldRetryQuery, queryClient } from '../queryClient'
import { ApiError } from '../api'

describe('QueryClient exponential backoff and retry policy', () => {
  it('skips retries on 4xx client errors (400, 401, 403, 422)', () => {
    expect(shouldRetryQuery(0, new ApiError(400, 'Bad Request'))).toBe(false)
    expect(shouldRetryQuery(0, new ApiError(401, 'Unauthorized'))).toBe(false)
    expect(shouldRetryQuery(0, new ApiError(403, 'Forbidden'))).toBe(false)
    expect(shouldRetryQuery(0, new ApiError(422, 'Insufficient funds'))).toBe(false)
    expect(shouldRetryQuery(1, new ApiError(422, 'Unprocessable Entity'))).toBe(false)
  })

  it('retries transient 5xx server errors up to 3 times', () => {
    expect(shouldRetryQuery(0, new ApiError(500, 'Internal Server Error'))).toBe(true)
    expect(shouldRetryQuery(1, new ApiError(502, 'Bad Gateway'))).toBe(true)
    expect(shouldRetryQuery(2, new ApiError(503, 'Service Unavailable'))).toBe(true)
    // 4th failure: should stop
    expect(shouldRetryQuery(3, new ApiError(503, 'Service Unavailable'))).toBe(false)
  })

  it('retries network offline errors (status 0) up to 3 times', () => {
    expect(shouldRetryQuery(0, new ApiError(0, 'Network Error'))).toBe(true)
    expect(shouldRetryQuery(1, new ApiError(0, 'Network Error'))).toBe(true)
    expect(shouldRetryQuery(2, new ApiError(0, 'Network Error'))).toBe(true)
    expect(shouldRetryQuery(3, new ApiError(0, 'Network Error'))).toBe(false)
  })

  it('computes exponential backoff capped at 8000ms', () => {
    const defaultQueryOptions = queryClient.getDefaultOptions().queries
    const retryDelay = defaultQueryOptions?.retryDelay as (attempt: number) => number

    expect(typeof retryDelay).toBe('function')
    expect(retryDelay(0)).toBe(1000) // 1000 * 2^0 = 1000ms
    expect(retryDelay(1)).toBe(2000) // 1000 * 2^1 = 2000ms
    expect(retryDelay(2)).toBe(4000) // 1000 * 2^2 = 4000ms
    expect(retryDelay(3)).toBe(8000) // 1000 * 2^3 = 8000ms
    expect(retryDelay(4)).toBe(8000) // capped at 8000ms
    expect(retryDelay(5)).toBe(8000) // capped at 8000ms
  })
})
