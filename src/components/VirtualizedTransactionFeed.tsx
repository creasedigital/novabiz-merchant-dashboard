import React from 'react'
import { FixedSizeList, areEqual, type ListChildComponentProps } from 'react-window'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/ui/card'
import { Badge } from '@/ui/badge'
import { Button } from '@/ui/button'
import { Skeleton } from '@/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/ui/alert'
import { useTransactions } from '@/hooks/useDashboardData'
import { useAppStore } from '@/store/useAppStore'
import { formatKoboToNaira } from '@/utils/currency'
import { sanitizeNarration } from '@/utils/sanitize'
import type { Transaction } from '@/types/domain'
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  Inbox,
  RotateCcw,
  RefreshCw,
  QrCode,
  Smartphone,
  Banknote,
} from 'lucide-react'

const ROW_HEIGHT = 96

function getChannelIcon(channel: Transaction['channel']) {
  switch (channel) {
    case 'POS_QR':
      return <QrCode className="h-3 w-3 text-brand-600 dark:text-brand-400" />
    case 'USSD':
      return <Smartphone className="h-3 w-3 text-purple-600 dark:text-purple-400" />
    case 'NIP':
    default:
      return <Banknote className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
  }
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return iso
  }
}

/**
 * Memoized Row Component
 * Evaluates areEqual from react-window to guarantee 60fps scrolling
 * across 1,000+ transaction rows.
 */
interface RowProps extends ListChildComponentProps<Transaction[]> {}

const TransactionRow = React.memo(({ data, index, style }: RowProps) => {
  const tx = data[index]
  if (!tx) return null

  const isCredit = tx.type === 'credit'
  const isOptimistic = tx.optimistic === true
  const sanitizedDescription = sanitizeNarration(tx.narration)

  return (
    <div
      style={style}
      className="flex flex-col justify-center px-3 sm:px-5 border-b border-gray-100 dark:border-gray-800/80 hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors text-xs sm:text-sm"
      role="row"
      aria-label={`Transaction ${tx.reference}`}
    >
      {/* Top Line: Counterparty + Status + Amount */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`h-7 w-7 rounded-full shrink-0 flex items-center justify-center ${
              isCredit
                ? 'bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            {isCredit ? (
              <ArrowDownLeft className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5" />
            )}
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {tx.counterpartyName}
          </span>

          {/* Status Badge */}
          {isOptimistic ? (
            <Badge
              variant="pending"
              className="animate-pulse bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 text-[10px] shrink-0"
            >
              Optimistic • Sending...
            </Badge>
          ) : (
            <Badge variant={tx.status} className="text-[10px] shrink-0 capitalize">
              {tx.status}
            </Badge>
          )}
        </div>

        {/* Amount */}
        <div className="text-right shrink-0">
          <span
            className={`font-bold font-mono text-xs sm:text-sm ${
              isCredit
                ? 'text-green-700 dark:text-green-400'
                : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {isCredit ? '+' : '-'}
            {formatKoboToNaira(tx.amountKobo)}
          </span>
          {tx.feeKobo > 0 && (
            <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-mono">
              Fee: {formatKoboToNaira(tx.feeKobo)}
            </span>
          )}
        </div>
      </div>

      {/* Middle Line: Sanitized Narration */}
      <div className="mt-1 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 truncate">
        <span className="truncate italic">
          {sanitizedDescription || 'No description provided'}
        </span>
      </div>

      {/* Bottom Line: Bank, NUBAN, Channel, Date */}
      <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
        <div className="flex items-center gap-1.5 truncate">
          <span className="truncate">
            {tx.counterpartyBank} • {tx.counterpartyAccount}
          </span>
          <span className="hidden sm:inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-300">
            {getChannelIcon(tx.channel)}
            {tx.channel}
          </span>
        </div>
        <span className="shrink-0">{formatDate(tx.createdAt)}</span>
      </div>
    </div>
  )
}, areEqual)

TransactionRow.displayName = 'TransactionRow'

export function VirtualizedTransactionFeed() {
  const { data, isLoading, isError, error, refetch, isFetching } = useTransactions()
  const resetFilters = useAppStore((state) => state.resetFilters)

  const transactions = data?.data ?? []
  const total = data?.total ?? 0
  const filteredTotal = data?.filteredTotal ?? transactions.length

  // Loading State
  if (isLoading) {
    return (
      <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2.5">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-64" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-28" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  // Error State
  if (isError) {
    return (
      <Card className="border-gray-200 dark:border-gray-800 shadow-sm p-4">
        <Alert variant="destructive" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <AlertTitle className="font-semibold">Unable to load transactions</AlertTitle>
              <AlertDescription className="text-sm mt-0.5">
                {error instanceof Error ? error.message : 'A network error occurred while querying the transaction ledger.'}
              </AlertDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="shrink-0 border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-950/50"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
            Retry Query
          </Button>
        </Alert>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <CardHeader className="py-3 px-4 sm:px-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Transaction Feed
            </CardTitle>
            <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
              Showing {filteredTotal.toLocaleString()} of {total.toLocaleString()} transactions
              {transactions.length > 500 && ' • Virtualized 60fps'}
            </CardDescription>
          </div>
          {isFetching && (
            <div className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 font-medium">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
              <Inbox className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                No transactions found
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                No transactions match the selected filters. Try adjusting your search query, status, or date range.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="text-xs h-9"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Clear Filters
            </Button>
          </div>
        ) : (
          /* Virtualized List Container (FixedSizeList) */
          <div className="w-full h-[560px]" role="table" aria-label="Transactions List">
            <FixedSizeList
              height={560}
              width="100%"
              itemCount={transactions.length}
              itemSize={ROW_HEIGHT}
              itemData={transactions}
              overscanCount={5}
            >
              {TransactionRow}
            </FixedSizeList>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
