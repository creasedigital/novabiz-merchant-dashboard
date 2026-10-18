import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useSendMoney, NIP_FEE_KOBO } from '../useSendMoney'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WALLET_QUERY_KEY, TRANSACTIONS_QUERY_KEY } from '../useDashboardData'
import * as apiModule from '@/lib/api'
import type { WalletSummary, SendMoneyPayload, Kobo } from '@/types/domain'
import React from 'react'

vi.mock('@/lib/api', () => ({
  postTransfer: vi.fn(),
}))

const mockInitialWallet: WalletSummary = {
  availableBalanceKobo: 50000000 as Kobo, // ₦500,000.00
  ledgerBalanceKobo: 50000000 as Kobo,
  todayInflowKobo: 10000000 as Kobo,
  todayOutflowKobo: 5000000 as Kobo,
  merchantName: 'NovaBiz Ltd',
  merchantId: 'MID-00123456',
  kycTier: 'TIER_2',
  dailyLimitRemainingKobo: 25000000 as Kobo,
}

const mockPayload: SendMoneyPayload = {
  recipientAccount: '0123456789',
  recipientBankCode: '011',
  recipientName: 'Adaeze Okonkwo',
  amountKobo: 1000000 as Kobo, // ₦10,000.00
  narration: 'Payment for stock',
  pin: '1234',
  idempotencyKey: 'test-uuid-1234',
}

describe('useSendMoney hook — optimistic reconciliation & rollback', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    queryClient.setQueryData(WALLET_QUERY_KEY, mockInitialWallet)
    queryClient.setQueryData(TRANSACTIONS_QUERY_KEY, {
      data: [],
      nextCursor: null,
      total: 0,
      filteredTotal: 0,
    })
  })

  function createWrapper() {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  it('immediately applies optimistic deduction to wallet and adds optimistic debit row', async () => {
    vi.mocked(apiModule.postTransfer).mockImplementation(
      () => new Promise(() => {}), // Pending promise to check optimistic state
    )

    const { result } = renderHook(() => useSendMoney(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate(mockPayload)
    })

    const expectedDeduction = mockPayload.amountKobo + NIP_FEE_KOBO
    const expectedBalance = mockInitialWallet.availableBalanceKobo - expectedDeduction

    // Await async onMutate execution
    await waitFor(() => {
      const updatedWallet = queryClient.getQueryData<WalletSummary>(WALLET_QUERY_KEY)
      expect(updatedWallet?.availableBalanceKobo).toBe(expectedBalance)
      expect(updatedWallet?.todayOutflowKobo).toBe(
        mockInitialWallet.todayOutflowKobo + expectedDeduction,
      )
    })

    // Check optimistic transaction added
    await waitFor(() => {
      const txCache = queryClient.getQueryData<apiModule.TransactionsResponse>(TRANSACTIONS_QUERY_KEY)
      expect(txCache?.data.length).toBe(1)
      expect(txCache?.data[0]?.optimistic).toBe(true)
      expect(txCache?.data[0]?.amountKobo).toBe(mockPayload.amountKobo)
      expect(txCache?.data[0]?.counterpartyName).toBe(mockPayload.recipientName)
    })
  })

  it('automatically rolls back balance and removes optimistic transaction on error', async () => {
    vi.mocked(apiModule.postTransfer).mockRejectedValue(new Error('503 Service Unavailable'))

    const onErrorMock = vi.fn()
    const { result } = renderHook(
      () =>
        useSendMoney({
          onError: onErrorMock,
        }),
      {
        wrapper: createWrapper(),
      },
    )

    await act(async () => {
      try {
        await result.current.mutateAsync(mockPayload)
      } catch {
        // Expected mutation failure
      }
    })

    // Check wallet rolled back to exact initial value
    const restoredWallet = queryClient.getQueryData<WalletSummary>(WALLET_QUERY_KEY)
    expect(restoredWallet?.availableBalanceKobo).toBe(mockInitialWallet.availableBalanceKobo)
    expect(restoredWallet?.todayOutflowKobo).toBe(mockInitialWallet.todayOutflowKobo)

    // Check transactions list rolled back (optimistic item removed)
    const txCache = queryClient.getQueryData<apiModule.TransactionsResponse>(TRANSACTIONS_QUERY_KEY)
    expect(txCache?.data.length).toBe(0)
    expect(onErrorMock).toHaveBeenCalledTimes(1)
  })
})
