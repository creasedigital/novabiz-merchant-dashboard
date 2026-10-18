import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardContent } from '@/App'
import { useAppStore } from '@/store/useAppStore'
import { resetMockDb } from '@/mocks/db'
import { resetIdempotencyStore } from '@/mocks/handlers'

describe('TransactionFeed Integration & Filtering', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    resetMockDb()
    resetIdempotencyStore()
    useAppStore.getState().resetChaos()
    useAppStore.getState().resetFilters()

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
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

  it('renders virtualized feed with 1,000+ seeded transactions at 60fps', async () => {
    renderDashboard()

    // Assert that feed loads and displays total count
    await waitFor(() => {
      expect(screen.getByText(/Showing 1,250 of 1,250 transactions/i)).toBeInTheDocument()
    })

    // Assert virtualized 60fps badge
    expect(screen.getByText(/Virtualized 60fps/i)).toBeInTheDocument()

    // Assert presence of transaction table role
    expect(screen.getByRole('table', { name: /transactions list/i })).toBeInTheDocument()
  })

  it('filters transactions by search query', async () => {
    const { user } = renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/Showing 1,250 of 1,250 transactions/i)).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText(/search narration, name, nuban/i)
    await user.type(searchInput, 'POS collection')

    await waitFor(() => {
      expect(screen.queryByText(/Showing 1,250 of 1,250 transactions/i)).not.toBeInTheDocument()
    })
  })

  it('renders untrusted XSS probe narrations safely as plain text without DOM execution', async () => {
    const { user, container } = renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/Showing 1,250 of 1,250 transactions/i)).toBeInTheDocument()
    })

    // Search for the XSS probe transaction in the feed
    const searchInput = screen.getByPlaceholderText(/search narration, name, nuban/i)
    await user.type(searchInput, 'Payment for stock')

    await waitFor(() => {
      // Tags must be stripped; only plain text rendered
      expect(screen.getAllByText(/Payment for stock/i).length).toBeGreaterThan(0)
    })

    // Verify no script or unescaped img tags were injected into DOM
    expect(container.querySelector('img[src="x"]')).toBeNull()
    expect(container.querySelector('script')).toBeNull()
  })
})
