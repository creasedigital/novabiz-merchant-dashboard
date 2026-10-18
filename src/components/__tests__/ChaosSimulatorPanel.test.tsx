import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { ChaosSimulatorPanel } from '../ChaosSimulatorPanel'
import { useAppStore } from '@/store/useAppStore'

describe('ChaosSimulatorPanel component', () => {
  beforeEach(() => {
    useAppStore.getState().resetChaos()
  })

  it('renders floating trigger button and opens popover on click', () => {
    render(<ChaosSimulatorPanel />)

    const trigger = screen.getByRole('button', { name: /open evaluator chaos simulator/i })
    expect(trigger).toBeInTheDocument()

    fireEvent.click(trigger)

    expect(screen.getByText('Evaluator Chaos Simulator')).toBeInTheDocument()
    expect(
      screen.getByText(/Force Next Transfer to Fail/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Simulate Offline Mode/i),
    ).toBeInTheDocument()
  })

  it('updates chaos config when toggling switches', () => {
    render(<ChaosSimulatorPanel />)

    const trigger = screen.getByRole('button', { name: /open evaluator chaos simulator/i })
    fireEvent.click(trigger)

    const forceFailSwitch = screen.getByRole('switch', {
      name: /force next transfer to fail/i,
    })
    expect(forceFailSwitch).toHaveAttribute('aria-checked', 'false')

    fireEvent.click(forceFailSwitch)
    expect(useAppStore.getState().chaos.forceNextTransferFail).toBe(true)

    const offlineSwitch = screen.getByRole('switch', {
      name: /simulate offline mode/i,
    })
    fireEvent.click(offlineSwitch)
    expect(useAppStore.getState().chaos.isSimulatedOffline).toBe(true)
  })
})
