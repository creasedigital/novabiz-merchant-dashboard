import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SendMoneyModal } from '../SendMoneyModal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as apiModule from '@/lib/api'
import * as dashboardDataHooks from '@/hooks/useDashboardData'
import type { WalletSummary, Kobo } from '@/types/domain'

vi.mock('@/lib/api', () => ({
  getBanks: vi.fn(),
  resolveAccount: vi.fn(),
  postTransfer: vi.fn(),
}))

vi.mock('@/hooks/useDashboardData', () => ({
  useWalletSummary: vi.fn(),
  WALLET_QUERY_KEY: ['wallet-summary'],
  TRANSACTIONS_QUERY_KEY: ['transactions'],
}))

const mockWallet: WalletSummary = {
  availableBalanceKobo: 50000000 as Kobo, // ₦500,000.00
  ledgerBalanceKobo: 50000000 as Kobo,
  todayInflowKobo: 10000000 as Kobo,
  todayOutflowKobo: 5000000 as Kobo,
  merchantName: 'NovaBiz Ltd',
  merchantId: 'MID-00123456',
  kycTier: 'TIER_2',
  dailyLimitRemainingKobo: 25000000 as Kobo,
}

describe('SendMoneyModal component', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    vi.mocked(dashboardDataHooks.useWalletSummary).mockReturnValue({
      data: mockWallet,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof dashboardDataHooks.useWalletSummary>)

    vi.mocked(apiModule.getBanks).mockResolvedValue([
      { name: 'First Bank of Nigeria', code: '011' },
      { name: 'Guaranty Trust Bank', code: '058' },
    ])

    vi.mocked(apiModule.resolveAccount).mockResolvedValue({
      accountNumber: '0123456789',
      accountName: 'Adaeze Okonkwo',
      bankCode: '011',
      bankName: 'First Bank of Nigeria',
    })
  })

  function renderModal(props: { open: boolean; onOpenChange: (open: boolean) => void }) {
    return render(
      <QueryClientProvider client={queryClient}>
        <SendMoneyModal {...props} />
      </QueryClientProvider>,
    )
  }

  it('resolves NUBAN account automatically when 10 digits are entered in Step 1', async () => {
    renderModal({ open: true, onOpenChange: vi.fn() })

    expect(screen.getByText(/Send Money \(NIP\)/i)).toBeInTheDocument()

    const accountInput = screen.getByPlaceholderText(/0123456789/i)
    fireEvent.change(accountInput, { target: { value: '0123456789' } })

    await waitFor(() => {
      expect(apiModule.resolveAccount).toHaveBeenCalledWith('0123456789', '011')
    })

    await waitFor(() => {
      expect(screen.getByText('Adaeze Okonkwo')).toBeInTheDocument()
      expect(screen.getByText(/Verified NIBSS Beneficiary/i)).toBeInTheDocument()
    })

    // Continue button becomes enabled
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).toBeEnabled()
  })

  it('validates minimum amount and advances to Step 3 with locked Idempotency Key', async () => {
    renderModal({ open: true, onOpenChange: vi.fn() })

    // Step 1: Fill Account
    const accountInput = screen.getByPlaceholderText(/0123456789/i)
    fireEvent.change(accountInput, { target: { value: '0123456789' } })

    await waitFor(() => {
      expect(screen.getByText('Adaeze Okonkwo')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // Step 2: Amount
    await waitFor(() => {
      expect(screen.getByText(/Transfer Amount/i)).toBeInTheDocument()
    })

    const amountInput = screen.getByPlaceholderText('0.00')

    // Test below minimum (e.g. ₦50)
    fireEvent.change(amountInput, { target: { value: '50.00' } })
    expect(screen.getByText(/must be greater than ₦100\.00/i)).toBeInTheDocument()

    // Test valid amount: ₦15,000.00
    fireEvent.change(amountInput, { target: { value: '15,000.00' } })
    expect(screen.queryByText(/must be greater than ₦100\.00/i)).not.toBeInTheDocument()

    // Advance to Step 3 (Review)
    const reviewBtn = screen.getByRole('button', { name: /review transfer/i })
    expect(reviewBtn).toBeEnabled()
    fireEvent.click(reviewBtn)

    // Step 3: Review Card checks
    await waitFor(() => {
      expect(screen.getByText(/^Beneficiary$/i)).toBeInTheDocument()
      expect(screen.getAllByText('Adaeze Okonkwo').length).toBeGreaterThan(0)
      expect(screen.getByText(/₦15,000\.00/)).toBeInTheDocument()
      expect(screen.getByText(/₦10\.75/)).toBeInTheDocument()
      expect(screen.getByText(/₦15,010\.75/)).toBeInTheDocument()
      expect(screen.getByText(/Idempotency Key/i)).toBeInTheDocument()
    })
  })
})
