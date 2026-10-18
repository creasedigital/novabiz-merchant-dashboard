/**
 * Custom hooks for NovaBiz Dashboard Queries
 */
import { useQuery } from '@tanstack/react-query'
import { getWalletSummary, getTransactions, type TransactionsResponse } from '@/lib/api'
import { useAppStore } from '@/store/useAppStore'
import type { WalletSummary } from '@/types/domain'

export const WALLET_QUERY_KEY = ['wallet-summary'] as const
export const TRANSACTIONS_QUERY_KEY = ['transactions'] as const

export function useWalletSummary() {
  return useQuery<WalletSummary>({
    queryKey: WALLET_QUERY_KEY,
    queryFn: getWalletSummary,
  })
}

export function useTransactions() {
  const filters = useAppStore((state) => state.filters)

  return useQuery<TransactionsResponse>({
    queryKey: [...TRANSACTIONS_QUERY_KEY, filters],
    queryFn: () => getTransactions(filters),
  })
}
