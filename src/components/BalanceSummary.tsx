import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/ui/card'
import { Skeleton } from '@/ui/skeleton'
import { Alert, AlertTitle, AlertDescription } from '@/ui/alert'
import { Button } from '@/ui/button'
import { useWalletSummary } from '@/hooks/useDashboardData'
import { formatKoboToNaira } from '@/utils/currency'
import { Wallet, ArrowDownLeft, ArrowUpRight, AlertCircle, RefreshCw } from 'lucide-react'

export function BalanceSummary() {
  const { data: wallet, isLoading, isError, error, refetch, isFetching } = useWalletSummary()

  // Track previous balance to trigger live-region announcements for screen readers
  const [liveAnnouncement, setLiveAnnouncement] = React.useState<string>('')
  const prevBalanceRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (wallet?.availableBalanceKobo !== undefined) {
      if (
        prevBalanceRef.current !== null &&
        prevBalanceRef.current !== wallet.availableBalanceKobo
      ) {
        const formatted = formatKoboToNaira(wallet.availableBalanceKobo)
        setLiveAnnouncement(`Available balance updated to ${formatted}`)
      }
      prevBalanceRef.current = wallet.availableBalanceKobo
    }
  }, [wallet?.availableBalanceKobo])

  // Explicit Loading State with Skeletons
  if (isLoading) {
    return (
      <section aria-label="Wallet Balance Summary" className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-gray-200 dark:border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-44" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    )
  }

  // Explicit Error State with Retry Button
  if (isError) {
    return (
      <section aria-label="Wallet Balance Summary" className="w-full">
        <Alert variant="destructive" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <AlertTitle className="font-semibold">Unable to retrieve wallet balance</AlertTitle>
              <AlertDescription className="text-sm mt-0.5">
                {error instanceof Error ? error.message : 'A network or server error occurred.'}
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
            Retry
          </Button>
        </Alert>
      </section>
    )
  }

  if (!wallet) return null

  return (
    <section aria-label="Wallet Balance Summary" className="w-full relative">
      {/* Accessible live status region for screen readers */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveAnnouncement}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Available Balance */}
        <Card className="border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-brand-600" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Available Balance
            </CardTitle>
            <div className="h-9 w-9 rounded-full bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              data-testid="available-balance-amount"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50"
            >
              {formatKoboToNaira(wallet.availableBalanceKobo)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
              <span>Ledger: {formatKoboToNaira(wallet.ledgerBalanceKobo)}</span>
              <span className="text-brand-700 dark:text-brand-300 font-medium">
                Limit: {formatKoboToNaira(wallet.dailyLimitRemainingKobo)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Today's Inflow (Credit) */}
        <Card className="border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Today's Inflow
            </CardTitle>
            <div className="h-9 w-9 rounded-full bg-green-50 dark:bg-green-950/50 flex items-center justify-center text-green-600 dark:text-green-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-green-700 dark:text-green-400">
              +{formatKoboToNaira(wallet.todayInflowKobo)}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
              Total customer receipts & POS credits today
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Today's Outflow (Debit) */}
        <Card className="border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Today's Outflow
            </CardTitle>
            <div className="h-9 w-9 rounded-full bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              -{formatKoboToNaira(wallet.todayOutflowKobo)}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
              Transfers & vendor disbursements today
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
