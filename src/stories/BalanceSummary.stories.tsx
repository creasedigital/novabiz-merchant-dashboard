import type { Meta, StoryObj } from '@storybook/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BalanceSummary } from '@/components/BalanceSummary'
import { WALLET_QUERY_KEY } from '@/hooks/useDashboardData'
import type { WalletSummary, Kobo } from '@/types/domain'

const mockWallet: WalletSummary = {
  merchantId: 'MID-00123456',
  merchantName: 'NovaBiz Enterprises Ltd',
  kycTier: 'TIER_2',
  availableBalanceKobo: 48525050 as Kobo, // ₦485,250.50
  ledgerBalanceKobo: 48525050 as Kobo,
  todayInflowKobo: 12500000 as Kobo, // ₦125,000.00
  todayOutflowKobo: 4500000 as Kobo, // ₦45,000.00
  dailyLimitRemainingKobo: 30000000 as Kobo, // ₦300,000.00
}

const meta: Meta<typeof BalanceSummary> = {
  title: 'Dashboard/BalanceSummary',
  component: BalanceSummary,
  parameters: {
    layout: 'padded',
  },
}

export default meta

export const LoadedState: StoryObj = {
  render: () => {
    const client = new QueryClient()
    client.setQueryData(WALLET_QUERY_KEY, mockWallet)

    return (
      <QueryClientProvider client={client}>
        <div className="max-w-5xl">
          <BalanceSummary />
        </div>
      </QueryClientProvider>
    )
  },
}

export const LoadingState: StoryObj = {
  render: () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          queryFn: () => new Promise(() => {}), // Never resolves
          enabled: true,
        },
      },
    })

    return (
      <QueryClientProvider client={client}>
        <div className="max-w-5xl">
          <BalanceSummary />
        </div>
      </QueryClientProvider>
    )
  },
}

export const ErrorState: StoryObj = {
  render: () => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          queryFn: () => {
            throw new Error('NIBSS settlement gateway connection timed out (HTTP 504 Gateway Timeout)')
          },
        },
      },
    })

    return (
      <QueryClientProvider client={client}>
        <div className="max-w-5xl">
          <BalanceSummary />
        </div>
      </QueryClientProvider>
    )
  },
}
