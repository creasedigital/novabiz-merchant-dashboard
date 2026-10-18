import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BalanceSummary } from '../BalanceSummary'
import * as dashboardDataHooks from '@/hooks/useDashboardData'
import type { WalletSummary, Kobo } from '@/types/domain'

vi.mock('@/hooks/useDashboardData', () => ({
  useWalletSummary: vi.fn(),
}))

const mockWallet: WalletSummary = {
  availableBalanceKobo: 48525050 as Kobo, // ₦485,250.50
  ledgerBalanceKobo: 51200000 as Kobo,    // ₦512,000.00
  todayInflowKobo: 3875000 as Kobo,       // ₦38,750.00
  todayOutflowKobo: 1245200 as Kobo,      // ₦12,452.00
  merchantName: 'NovaBiz Enterprises Ltd',
  merchantId: 'MID-00123456',
  kycTier: 'TIER_2',
  dailyLimitRemainingKobo: 28754800 as Kobo,
}

describe('BalanceSummary component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders skeleton loading placeholders when query is loading', () => {
    vi.mocked(dashboardDataHooks.useWalletSummary).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: true,
    } as unknown as ReturnType<typeof dashboardDataHooks.useWalletSummary>)

    const { container } = render(<BalanceSummary />)
    const skeletons = container.querySelectorAll('[aria-hidden="true"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders error alert with retry button when query fails', () => {
    const mockRefetch = vi.fn()
    vi.mocked(dashboardDataHooks.useWalletSummary).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network timeout connecting to NIBSS'),
      refetch: mockRefetch,
      isFetching: false,
    } as unknown as ReturnType<typeof dashboardDataHooks.useWalletSummary>)

    render(<BalanceSummary />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/Unable to retrieve wallet balance/i)).toBeInTheDocument()
    expect(screen.getByText(/Network timeout connecting to NIBSS/i)).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /retry/i })
    fireEvent.click(retryBtn)
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('renders 3 formatted metric cards with strict integer kobo formatting', () => {
    vi.mocked(dashboardDataHooks.useWalletSummary).mockReturnValue({
      data: mockWallet,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof dashboardDataHooks.useWalletSummary>)

    render(<BalanceSummary />)

    // Check titles
    expect(screen.getByText('Available Balance')).toBeInTheDocument()
    expect(screen.getByText("Today's Inflow")).toBeInTheDocument()
    expect(screen.getByText("Today's Outflow")).toBeInTheDocument()

    // Formatted Naira check
    expect(screen.getByText(/485,250\.50/)).toBeInTheDocument()
    expect(screen.getByText(/\+.*38,750\.00/)).toBeInTheDocument()
    expect(screen.getByText(/-.*12,452\.00/)).toBeInTheDocument()

    // Subtitle details
    expect(screen.getByText(/Ledger:/)).toBeInTheDocument()
    expect(screen.getByText(/Limit:/)).toBeInTheDocument()
  })

  it('provides an accessible polite live region for screen readers', () => {
    vi.mocked(dashboardDataHooks.useWalletSummary).mockReturnValue({
      data: mockWallet,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof dashboardDataHooks.useWalletSummary>)

    const { container } = render(<BalanceSummary />)
    const liveRegion = container.querySelector('[role="status"]')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveAttribute('aria-live', 'polite')
  })
})
