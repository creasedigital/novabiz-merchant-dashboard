import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Header } from '../Header'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAppStore } from '@/store/useAppStore'

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('Header component', () => {
  beforeEach(() => {
    useAppStore.setState({
      theme: 'light',
      chaos: {
        latencyMs: 350,
        failureRate: 0,
        forceNextTransferFail: false,
        isSimulatedOffline: false,
      },
    })
  })

  it('renders merchant information and Send Money button', () => {
    const handleSendMoney = vi.fn()
    renderWithClient(<Header onOpenSendMoney={handleSendMoney} />)

    expect(screen.getByText('Send Money')).toBeInTheDocument()
    expect(screen.getByText(/MID:/)).toBeInTheDocument()

    const sendBtn = screen.getByRole('button', { name: /send money/i })
    fireEvent.click(sendBtn)
    expect(handleSendMoney).toHaveBeenCalledTimes(1)
  })

  it('renders accessible Dark Mode toggle and switches theme', () => {
    renderWithClient(<Header />)

    const switchBtn = screen.getByRole('switch', { name: /toggle dark mode/i })
    expect(switchBtn).toBeInTheDocument()
    expect(switchBtn).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(switchBtn)
    expect(useAppStore.getState().theme).toBe('dark')
  })

  it('renders FirstBank USSD *894# emergency banner when offline is simulated', () => {
    useAppStore.setState({
      chaos: {
        latencyMs: 350,
        failureRate: 0,
        forceNextTransferFail: false,
        isSimulatedOffline: true,
      },
    })

    renderWithClient(<Header />)

    expect(
      screen.getByText(/Poor connectivity detected/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/\*894#/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/dial/i),
    ).toBeInTheDocument()
  })
})
