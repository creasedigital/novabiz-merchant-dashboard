import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VirtualizedTransactionFeed } from '../VirtualizedTransactionFeed'
import * as dashboardDataHooks from '@/hooks/useDashboardData'
import { useAppStore } from '@/store/useAppStore'
import type { Transaction, Kobo } from '@/types/domain'

vi.mock('@/hooks/useDashboardData', () => ({
  useTransactions: vi.fn(),
}))

const mockTransactions: Transaction[] = [
  {
    id: 'txn-00001',
    reference: 'NIP000000001234',
    type: 'credit',
    status: 'successful',
    amountKobo: 5000000 as Kobo, // ₦50,000.00
    feeKobo: 0 as Kobo,
    counterpartyName: 'Adaeze Okonkwo',
    counterpartyBank: 'First Bank of Nigeria',
    counterpartyAccount: '0123456789',
    narration: 'Payment for wholesale supplies',
    channel: 'NIP',
    createdAt: '2026-10-15T14:30:00.000Z',
  },
  {
    id: 'txn-00002',
    reference: 'NIP000000001235',
    type: 'debit',
    status: 'pending',
    amountKobo: 1250000 as Kobo, // ₦12,500.00
    feeKobo: 5300 as Kobo,        // ₦53.00
    counterpartyName: 'Chukwuemeka Adeleke',
    counterpartyBank: 'Guaranty Trust Bank',
    counterpartyAccount: '9876543210',
    narration: '<img src=x onerror=alert(1)> Payment for stock', // XSS probe
    channel: 'NIP',
    createdAt: '2026-10-15T15:00:00.000Z',
    optimistic: true,
  },
]

describe('VirtualizedTransactionFeed component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useAppStore.getState().resetFilters()
  })

  it('renders skeleton rows while data is loading', () => {
    vi.mocked(dashboardDataHooks.useTransactions).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: true,
    } as unknown as ReturnType<typeof dashboardDataHooks.useTransactions>)

    const { container } = render(<VirtualizedTransactionFeed />)
    const skeletons = container.querySelectorAll('[aria-hidden="true"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders error alert with retry query button on query error', () => {
    const mockRefetch = vi.fn()
    vi.mocked(dashboardDataHooks.useTransactions).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to query ledger database'),
      refetch: mockRefetch,
      isFetching: false,
    } as unknown as ReturnType<typeof dashboardDataHooks.useTransactions>)

    render(<VirtualizedTransactionFeed />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Unable to load transactions/i)).toBeInTheDocument()
    expect(screen.getByText(/Failed to query ledger database/i)).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /retry query/i })
    fireEvent.click(retryBtn)
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('renders empty state when transaction list is empty with Clear Filters button', () => {
    vi.mocked(dashboardDataHooks.useTransactions).mockReturnValue({
      data: {
        data: [],
        nextCursor: null,
        total: 1250,
        filteredTotal: 0,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof dashboardDataHooks.useTransactions>)

    render(<VirtualizedTransactionFeed />)

    expect(screen.getByText('No transactions found')).toBeInTheDocument()
    const clearBtn = screen.getByRole('button', { name: /clear filters/i })
    expect(clearBtn).toBeInTheDocument()

    fireEvent.click(clearBtn)
    expect(useAppStore.getState().filters.status).toBe('all')
  })

  it('renders virtualized rows with counterparty, amount, and channel', () => {
    vi.mocked(dashboardDataHooks.useTransactions).mockReturnValue({
      data: {
        data: mockTransactions,
        nextCursor: null,
        total: 1250,
        filteredTotal: 2,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof dashboardDataHooks.useTransactions>)

    render(<VirtualizedTransactionFeed />)

    // Verify counterparty names
    expect(screen.getByText('Adaeze Okonkwo')).toBeInTheDocument()
    expect(screen.getByText('Chukwuemeka Adeleke')).toBeInTheDocument()

    // Verify formatted amounts
    expect(screen.getByText(/\+.*50,000\.00/)).toBeInTheDocument()
    expect(screen.getByText(/-.*12,500\.00/)).toBeInTheDocument()
    expect(screen.getByText(/Fee:.*53\.00/)).toBeInTheDocument()

    // Verify banks and accounts
    expect(screen.getByText(/First Bank of Nigeria • 0123456789/)).toBeInTheDocument()
    expect(screen.getByText(/Guaranty Trust Bank • 9876543210/)).toBeInTheDocument()
  })

  it('renders Optimistic Sending badge when tx.optimistic is true', () => {
    vi.mocked(dashboardDataHooks.useTransactions).mockReturnValue({
      data: {
        data: mockTransactions,
        nextCursor: null,
        total: 1250,
        filteredTotal: 2,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof dashboardDataHooks.useTransactions>)

    render(<VirtualizedTransactionFeed />)

    expect(screen.getByText('Optimistic • Sending...')).toBeInTheDocument()
  })

  it('sanitizes untrusted descriptions and renders them as plain text (no HTML injection)', () => {
    vi.mocked(dashboardDataHooks.useTransactions).mockReturnValue({
      data: {
        data: mockTransactions,
        nextCursor: null,
        total: 1250,
        filteredTotal: 2,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof dashboardDataHooks.useTransactions>)

    const { container } = render(<VirtualizedTransactionFeed />)

    // The XSS probe '<img src=x onerror=alert(1)> Payment for stock' must have tags stripped
    expect(screen.getByText('Payment for stock')).toBeInTheDocument()
    // No img element should have been injected into DOM
    expect(container.querySelector('img[src="x"]')).toBeNull()
  })
})
