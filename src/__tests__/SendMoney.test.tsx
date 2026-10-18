import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardContent } from '@/App'
import { useAppStore } from '@/store/useAppStore'
import { resetMockDb } from '@/mocks/db'
import { resetIdempotencyStore } from '@/mocks/handlers'
import { server } from '@/test/setup'
import { http, HttpResponse, delay } from 'msw'

describe('SendMoney Flow & Optimistic Rollback Reconciliation', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    resetMockDb()
    resetIdempotencyStore()
    useAppStore.getState().resetChaos()
    useAppStore.getState().resetFilters()

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  function renderDashboard() {
    const user = userEvent.setup()
    const utils = render(
      <QueryClientProvider client={queryClient}>
        <DashboardContent />
      </QueryClientProvider>,
    )
    return { user, ...utils }
  }

  it('enforces client-side validation errors and aria-invalid on input', async () => {
    const { user } = renderDashboard()

    // 1. Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Send Money')).toBeInTheDocument()
    })

    // 2. Open Send Money Dialog
    await user.click(screen.getByRole('button', { name: /send money/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const accountInput = screen.getByLabelText(/10-digit nuban account/i)
    expect(accountInput).toHaveAttribute('aria-invalid', 'false')

    // 3. Test invalid account (less than 10 digits)
    await user.type(accountInput, '12345')
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    expect(continueBtn).toBeDisabled()

    // 4. Fill valid 10 digits
    await user.clear(accountInput)
    await user.type(accountInput, '0123456789')

    // Beneficiary resolution occurs
    await waitFor(() => {
      expect(screen.getByText(/Verified NIBSS Beneficiary/i)).toBeInTheDocument()
    })
    expect(continueBtn).toBeEnabled()

    await user.click(continueBtn)

    // Step 2: Amount Validation
    await waitFor(() => {
      expect(screen.getByLabelText(/transfer amount/i)).toBeInTheDocument()
    })

    const amountInput = screen.getByLabelText(/transfer amount/i)

    // Amount below ₦100.00
    await user.type(amountInput, '50')
    expect(amountInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(/must be greater than ₦100\.00/i)

    // Amount exceeding available balance
    await user.clear(amountInput)
    await user.type(amountInput, '999,999,999.00')
    expect(amountInput).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent(/Insufficient funds/i)
  })

  it('optimistically updates balance, rolls back on 503 error, and supports retry with identical idempotency key', async () => {
    const capturedHeaders: string[] = []

    // Intercept /api/transfers to record idempotency keys
    server.use(
      http.post('/api/transfers', async ({ request }) => {
        const key = request.headers.get('Idempotency-Key') ?? ''
        capturedHeaders.push(key)

        await delay(150)

        const forceFail = request.headers.get('X-Chaos-Force-Fail') === '1'
        if (forceFail) {
          return HttpResponse.json(
            { error: 'Simulated 503 Gateway Timeout', code: 'TRANSFER_SERVICE_UNAVAILABLE' },
            { status: 503 },
          )
        }

        return HttpResponse.json({
          transaction: {
            id: 'txn-confirmed',
            reference: 'NIP0001',
            type: 'debit',
            status: 'successful',
            amountKobo: 200000,
            feeKobo: 1075,
            counterpartyName: 'Adaeze Okonkwo',
            counterpartyBank: 'First Bank of Nigeria',
            counterpartyAccount: '0123456789',
            narration: 'Payment for stock',
            channel: 'NIP',
            createdAt: new Date().toISOString(),
          },
          message: 'Transfer successful',
        })
      }),
    )

    // Enable Force Next Transfer to Fail
    useAppStore.getState().setChaos({
      forceNextTransferFail: true,
      latencyMs: 100, // Small latency to observe optimistic state
    })

    const { user } = renderDashboard()

    // Wait for balance to load
    await waitFor(() => {
      expect(screen.getByText(/485,250\.50/)).toBeInTheDocument()
    })

    // Open Modal
    await user.click(screen.getByRole('button', { name: /send money/i }))

    // Step 1: Account
    const accountInput = screen.getByLabelText(/10-digit nuban account/i)
    await user.type(accountInput, '0123456789')
    await waitFor(() => {
      expect(screen.getByText(/Verified NIBSS Beneficiary/i)).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /continue/i }))

    // Step 2: Amount (₦2,000.00 = 200,000 kobo + ₦10.75 fee = ₦2,010.75 debit)
    await waitFor(() => {
      expect(screen.getByLabelText(/transfer amount/i)).toBeInTheDocument()
    })
    const amountInput = screen.getByLabelText(/transfer amount/i)
    await user.type(amountInput, '2,000.00')
    await user.click(screen.getByRole('button', { name: /review transfer/i }))

    // Step 3: Review & PIN
    await waitFor(() => {
      expect(screen.getByText(/Idempotency Key/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/transaction pin/i)).toBeInTheDocument()
    })

    const pinInput = screen.getByLabelText(/transaction pin/i)
    fireEvent.change(pinInput, { target: { value: '1234' } })

    // Submit transfer
    const confirmBtn = screen.getByRole('button', { name: /confirm & send/i })
    expect(confirmBtn).toBeEnabled()
    fireEvent.click(confirmBtn)

    // 1. Assert optimistic update deduction: ₦485,250.50 - ₦2,010.75 = ₦483,239.75
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(screen.getByTestId('available-balance-amount')).toHaveTextContent(/483,239\.75/)
    })

    // 2. Assert that once 503 arrives, the balance cleanly rolls back to ₦485,250.50
    await waitFor(
      () => {
        expect(screen.getByTestId('available-balance-amount')).toHaveTextContent(/485,250\.50/)
      },
      { timeout: 3000 },
    )

    // 3. Assert destructive rollback toast notification and retry button
    await waitFor(() => {
      expect(screen.getByText(/Transfer Failed — Balance Restored/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry transfer/i, hidden: true })).toBeInTheDocument()
    })

    // 4. Verify Retry Transfer button re-submits with identical Idempotency-Key
    expect(capturedHeaders.length).toBe(1)
    const originalKey = capturedHeaders[0]
    expect(originalKey).toBeTruthy()

    const retryBtn = screen.getByRole('button', { name: /retry transfer/i, hidden: true })
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(capturedHeaders.length).toBe(2)
      expect(capturedHeaders[1]).toBe(originalKey)
    })
  })
})
