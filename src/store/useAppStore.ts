/**
 * useAppStore — global Zustand store with persist middleware.
 *
 * Manages three orthogonal slices:
 * 1. Theme  — light/dark with DOM class sync
 * 2. Network Chaos Config  — latency, failure rate, forced fail, offline
 * 3. Transaction Filters   — status, type, date range, search query
 *
 * All slices are persisted to localStorage under 'novabiz-app-store'.
 * Chaos config and filters are intentionally excluded from persistence
 * (they reset on page reload) via the `partialize` option.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ThemeMode = 'light' | 'dark'

export interface ChaosConfig {
  /** Simulated network round-trip latency in ms (added to every API call). */
  latencyMs: number
  /**
   * Probability [0, 1] that any API call returns 503 Service Unavailable.
   * 0 = never fail, 1 = always fail.
   */
  failureRate: number
  /**
   * When true, the *next* POST /api/transfers will deterministically return
   * 503 to test optimistic UI rollback — regardless of `failureRate`.
   * Automatically reset to false after it fires once.
   */
  forceNextTransferFail: boolean
  /** Simulates navigator.onLine = false, triggers offline banner. */
  isSimulatedOffline: boolean
}

import type { FilterStatus, FilterType, TransactionFilters } from '@/types/domain'
export type { FilterStatus, FilterType, TransactionFilters }

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------

interface AppState {
  // Theme
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void

  // Chaos
  chaos: ChaosConfig
  setChaos: (patch: Partial<ChaosConfig>) => void
  resetChaos: () => void

  // Filters
  filters: TransactionFilters
  setFilters: (patch: Partial<TransactionFilters>) => void
  resetFilters: () => void
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CHAOS: ChaosConfig = {
  latencyMs: 350,
  failureRate: 0,
  forceNextTransferFail: false,
  isSimulatedOffline: false,
}

const DEFAULT_FILTERS: TransactionFilters = {
  status: 'all',
  type: 'all',
  dateFrom: '',
  dateTo: '',
  searchQuery: '',
}

// ---------------------------------------------------------------------------
// DOM sync helper — keeps <html> class in sync with theme state
// ---------------------------------------------------------------------------

function applyThemeToDom(theme: ThemeMode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Theme ──────────────────────────────────────────────────────────────
      theme: 'light',

      setTheme: (theme) => {
        applyThemeToDom(theme)
        set({ theme })
      },

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        applyThemeToDom(next)
        set({ theme: next })
      },

      // ── Chaos Config ───────────────────────────────────────────────────────
      chaos: DEFAULT_CHAOS,

      setChaos: (patch) =>
        set((s) => ({ chaos: { ...s.chaos, ...patch } })),

      resetChaos: () => set({ chaos: DEFAULT_CHAOS }),

      // ── Transaction Filters ────────────────────────────────────────────────
      filters: DEFAULT_FILTERS,

      setFilters: (patch) =>
        set((s) => ({ filters: { ...s.filters, ...patch } })),

      resetFilters: () => set({ filters: DEFAULT_FILTERS }),
    }),
    {
      name: 'novabiz-app-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist theme — chaos config and filters reset on reload
      partialize: (state) => ({ theme: state.theme }),
      // Re-apply DOM class after rehydration
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeToDom(state.theme)
      },
    },
  ),
)
