import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { postTransfer, type TransferResult, type TransactionsResponse } from '@/lib/api'
import { WALLET_QUERY_KEY, TRANSACTIONS_QUERY_KEY } from '@/hooks/useDashboardData'
import { addKobo, subtractKobo, formatKoboToNaira } from '@/utils/currency'
import { sanitizeDisplayName, sanitizeNarration } from '@/utils/sanitize'
import { toast } from '@/ui/use-toast'
import type { SendMoneyPayload, WalletSummary, Transaction, Kobo } from '@/types/domain'

export const NIP_FEE_KOBO = 1075 as Kobo // ₦10.75

export interface SendMoneyContext {
  previousWallet: WalletSummary | undefined
  previousTransactions: Array<[readonly unknown[], TransactionsResponse | undefined]>
  optimisticTx: Transaction
}

export interface UseSendMoneyOptions {
  onSuccess?: (data: TransferResult, variables: SendMoneyPayload) => void
  onError?: (error: Error, variables: SendMoneyPayload, context: SendMoneyContext | undefined) => void
  onSettled?: () => void
}

export function useSendMoney(options?: UseSendMoneyOptions) {
  const queryClient = useQueryClient()

  const mutation = useMutation<TransferResult, Error, SendMoneyPayload, SendMoneyContext>({
    mutationFn: (payload) => postTransfer(payload),

    onMutate: async (variables) => {
      // 1. Cancel outgoing queries for wallet-summary and transactions
      await queryClient.cancelQueries({ queryKey: WALLET_QUERY_KEY })
      await queryClient.cancelQueries({ queryKey: TRANSACTIONS_QUERY_KEY })

      // 2. Snapshot current state for rollback
      const previousWallet = queryClient.getQueryData<WalletSummary>(WALLET_QUERY_KEY)
      const previousTransactions = queryClient.getQueriesData<TransactionsResponse>({
        queryKey: TRANSACTIONS_QUERY_KEY,
      })

      const totalDeductionKobo = addKobo(variables.amountKobo, NIP_FEE_KOBO)

      // 3. Create optimistic debit transaction
      const optimisticTx: Transaction = {
        id: `optimistic-${variables.idempotencyKey}`,
        reference: `OPT-${variables.idempotencyKey.slice(0, 8).toUpperCase()}`,
        type: 'debit',
        status: 'pending',
        amountKobo: variables.amountKobo,
        feeKobo: NIP_FEE_KOBO,
        counterpartyName: sanitizeDisplayName(variables.recipientName),
        counterpartyBank: 'Destination Bank',
        counterpartyAccount: variables.recipientAccount,
        narration: sanitizeNarration(variables.narration),
        channel: 'NIP',
        createdAt: new Date().toISOString(),
        optimistic: true,
      }

      // 4. Immediately deduct from cached wallet summary
      if (previousWallet) {
        queryClient.setQueryData<WalletSummary>(WALLET_QUERY_KEY, {
          ...previousWallet,
          availableBalanceKobo: subtractKobo(previousWallet.availableBalanceKobo, totalDeductionKobo),
          ledgerBalanceKobo: subtractKobo(previousWallet.ledgerBalanceKobo, totalDeductionKobo),
          todayOutflowKobo: addKobo(previousWallet.todayOutflowKobo, totalDeductionKobo),
          dailyLimitRemainingKobo: subtractKobo(
            previousWallet.dailyLimitRemainingKobo,
            variables.amountKobo,
          ),
        })
      }

      // 5. Prepend optimistic transaction to transaction cache
      queryClient.setQueriesData<TransactionsResponse>(
        { queryKey: TRANSACTIONS_QUERY_KEY },
        (old) => {
          if (!old) return old
          return {
            ...old,
            data: [optimisticTx, ...old.data],
            total: old.total + 1,
            filteredTotal: old.filteredTotal + 1,
          }
        },
      )

      return { previousWallet, previousTransactions, optimisticTx }
    },

    onError: (err, variables, context) => {
      // 1. Roll back wallet summary to pre-submit snapshot
      if (context?.previousWallet) {
        queryClient.setQueryData(WALLET_QUERY_KEY, context.previousWallet)
      }

      // 2. Roll back all transaction query caches
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }

      // 3. Trigger accessible destructive notification explaining rollback
      const amountDisplay = formatKoboToNaira(variables.amountKobo)
      toast({
        variant: 'destructive',
        title: 'Transfer Failed — Balance Restored',
        description: `${err.message || 'Transfer service unavailable'}. ${amountDisplay} (+ fee) was restored to your balance.`,
        duration: 8000,
        action: React.createElement(
          'button',
          {
            onClick: () => {
              // Retry with the exact same payload and idempotency key
              mutation.mutate(variables)
            },
            className:
              'inline-flex items-center justify-center px-2.5 py-1 text-xs font-semibold text-red-900 dark:text-red-100 bg-red-100 dark:bg-red-900/60 hover:bg-red-200 dark:hover:bg-red-800 rounded border border-red-300 dark:border-red-700 transition-colors shrink-0',
            'aria-label': 'Retry transfer with same idempotency key',
          },
          'Retry Transfer',
        ),
      })

      options?.onError?.(err, variables, context)
    },

    onSuccess: (data, variables) => {
      toast({
        variant: 'success',
        title: 'Transfer Sent',
        description: data.message,
        duration: 5000,
      })

      options?.onSuccess?.(data, variables)
    },

    onSettled: async () => {
      // Re-validate server state to guarantee consistency
      await queryClient.invalidateQueries({ queryKey: WALLET_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })

      options?.onSettled?.()
    },
  })

  return mutation
}
