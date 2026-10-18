import type { Meta, StoryObj } from '@storybook/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { VirtualizedTransactionFeed } from '@/components/VirtualizedTransactionFeed'
import { TRANSACTIONS_QUERY_KEY } from '@/hooks/useDashboardData'
import { useAppStore } from '@/store/useAppStore'
import { seedTransactions } from '@/mocks/db'
import type { TransactionsResponse } from '@/lib/api'

const meta: Meta<typeof VirtualizedTransactionFeed> = {
  title: 'Dashboard/VirtualizedTransactionFeed',
  component: VirtualizedTransactionFeed,
  parameters: {
    layout: 'padded',
  },
}

export default meta

export const Virtualized1250Rows: StoryObj = {
  render: () => {
    const filters = useAppStore.getState().filters
    const client = new QueryClient()

    const mockResponse: TransactionsResponse = {
      data: seedTransactions,
      nextCursor: null,
      total: seedTransactions.length,
      filteredTotal: seedTransactions.length,
    }

    client.setQueryData([...TRANSACTIONS_QUERY_KEY, filters], mockResponse)

    return (
      <QueryClientProvider client={client}>
        <div className="max-w-4xl">
          <VirtualizedTransactionFeed />
        </div>
      </QueryClientProvider>
    )
  },
}

export const EmptyState: StoryObj = {
  render: () => {
    const filters = useAppStore.getState().filters
    const client = new QueryClient()

    const emptyResponse: TransactionsResponse = {
      data: [],
      nextCursor: null,
      total: 1250,
      filteredTotal: 0,
    }

    client.setQueryData([...TRANSACTIONS_QUERY_KEY, filters], emptyResponse)

    return (
      <QueryClientProvider client={client}>
        <div className="max-w-4xl">
          <VirtualizedTransactionFeed />
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
            throw new Error('Database connection failed. Unable to fetch transaction records.')
          },
        },
      },
    })

    return (
      <QueryClientProvider client={client}>
        <div className="max-w-4xl">
          <VirtualizedTransactionFeed />
        </div>
      </QueryClientProvider>
    )
  },
}
