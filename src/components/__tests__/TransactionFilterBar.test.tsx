import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { TransactionFilterBar } from '../TransactionFilterBar'
import { useAppStore } from '@/store/useAppStore'

describe('TransactionFilterBar component', () => {
  beforeEach(() => {
    useAppStore.getState().resetFilters()
  })

  it('renders all accessible filter inputs', () => {
    render(<TransactionFilterBar />)

    expect(screen.getByRole('search', { name: /transaction filters/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/type/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/from date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/to date/i)).toBeInTheDocument()
  })

  it('updates store searchQuery when typing in search input', () => {
    render(<TransactionFilterBar />)

    const searchInput = screen.getByPlaceholderText(/search narration, name, nuban/i)
    fireEvent.change(searchInput, { target: { value: 'POS collection' } })

    expect(useAppStore.getState().filters.searchQuery).toBe('POS collection')
  })

  it('updates store dateFrom and dateTo when date inputs change', () => {
    render(<TransactionFilterBar />)

    const fromInput = screen.getByLabelText(/from date/i)
    const toInput = screen.getByLabelText(/to date/i)

    fireEvent.change(fromInput, { target: { value: '2026-01-01' } })
    fireEvent.change(toInput, { target: { value: '2026-01-31' } })

    expect(useAppStore.getState().filters.dateFrom).toBe('2026-01-01')
    expect(useAppStore.getState().filters.dateTo).toBe('2026-01-31')
  })

  it('displays Reset All button when active filters exist and clears them on click', () => {
    render(<TransactionFilterBar />)

    // Initially no reset button
    expect(screen.queryByRole('button', { name: /reset all/i })).not.toBeInTheDocument()

    // Add filter
    const searchInput = screen.getByLabelText(/search/i)
    fireEvent.change(searchInput, { target: { value: 'stock' } })

    // Reset button should now appear
    const resetBtn = screen.getByRole('button', { name: /reset all/i })
    expect(resetBtn).toBeInTheDocument()

    // Click reset
    fireEvent.click(resetBtn)
    expect(useAppStore.getState().filters.searchQuery).toBe('')
    expect(screen.queryByRole('button', { name: /reset all/i })).not.toBeInTheDocument()
  })
})
