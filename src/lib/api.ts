/**
 * NovaBiz — API Client & Chaos Header Interceptor
 *
 * All HTTP requests in the app go through `apiFetch`.
 * Injects chaos test headers from the Zustand store:
 *   - X-Chaos-Latency-Ms
 *   - X-Chaos-Failure-Rate
 *   - X-Chaos-Force-Fail
 * Throws typed `ApiError` with HTTP status code.
 */
import { useAppStore } from '@/store/useAppStore'
import type { WalletSummary, Transaction, TransactionFilters, SendMoneyPayload } from '@/types/domain'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const { chaos, setChaos } = useAppStore.getState()

  // Offline simulation check
  const isOffline =
    chaos.isSimulatedOffline || (typeof navigator !== 'undefined' && !navigator.onLine)

  if (isOffline) {
    throw new ApiError(0, 'Poor connectivity detected. Network request failed.')
  }

  const headers = new Headers(init?.headers)
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json')
  }

  // Inject chaos configuration headers
  headers.set('X-Chaos-Latency-Ms', String(chaos.latencyMs))
  headers.set('X-Chaos-Failure-Rate', String(chaos.failureRate))
  if (input.includes('/transfers') && chaos.forceNextTransferFail) {
    headers.set('X-Chaos-Force-Fail', '1')
    // Reset after injecting on transfer
    setChaos({ forceNextTransferFail: false })
  }

  const res = await fetch(input, {
    ...init,
    headers,
  })

  if (!res.ok) {
    let errBody: unknown
    try {
      errBody = await res.json()
    } catch {
      errBody = null
    }

    const message =
      errBody &&
      typeof errBody === 'object' &&
      'error' in errBody &&
      typeof (errBody as { error?: string }).error === 'string'
        ? (errBody as { error: string }).error
        : `Request failed with status ${res.status}`

    throw new ApiError(res.status, message, errBody)
  }

  return (await res.json()) as T
}

// ---------------------------------------------------------------------------
// Typed API Endpoints
// ---------------------------------------------------------------------------

export async function getWalletSummary(): Promise<WalletSummary> {
  return apiFetch<WalletSummary>('/api/wallet/summary')
}

export interface TransactionsResponse {
  data: Transaction[]
  nextCursor: string | null
  total: number
  filteredTotal: number
}

export async function getTransactions(
  filters?: Partial<TransactionFilters>,
  limit: number = 1500,
): Promise<TransactionsResponse> {
  const params = new URLSearchParams()
  if (filters?.status && filters.status !== 'all') {
    params.set('status', filters.status)
  }
  if (filters?.type && filters.type !== 'all') {
    params.set('type', filters.type)
  }
  if (filters?.dateFrom) {
    params.set('dateFrom', filters.dateFrom)
  }
  if (filters?.dateTo) {
    params.set('dateTo', filters.dateTo)
  }
  if (filters?.searchQuery) {
    params.set('q', filters.searchQuery)
  }
  params.set('limit', String(limit))

  const queryString = params.toString()
  const url = queryString ? `/api/transactions?${queryString}` : '/api/transactions'
  return apiFetch<TransactionsResponse>(url)
}

export interface BankItem {
  name: string
  code: string
}

export async function getBanks(): Promise<BankItem[]> {
  const res = await apiFetch<{ banks: BankItem[] }>('/api/banks/list')
  return res.banks
}

export interface ResolvedAccount {
  accountNumber: string
  accountName: string
  bankCode: string
  bankName: string
}

export async function resolveAccount(
  account: string,
  bankCode: string,
): Promise<ResolvedAccount> {
  const params = new URLSearchParams({ account, bankCode })
  return apiFetch<ResolvedAccount>(`/api/banks/resolve?${params.toString()}`)
}

export interface TransferResult {
  transaction: Transaction
  message: string
}

export async function postTransfer(
  payload: SendMoneyPayload,
): Promise<TransferResult> {
  return apiFetch<TransferResult>('/api/transfers', {
    method: 'POST',
    headers: {
      'Idempotency-Key': payload.idempotencyKey,
    },
    body: JSON.stringify(payload),
  })
}

