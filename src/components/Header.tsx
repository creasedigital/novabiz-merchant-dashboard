import React from 'react'
import { Button } from '@/ui/button'
import { Badge } from '@/ui/badge'
import { Switch } from '@/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert'
import { useAppStore } from '@/store/useAppStore'
import { useWalletSummary } from '@/hooks/useDashboardData'
import { useIsFetching } from '@tanstack/react-query'
import { Sun, Moon, Send, WifiOff, AlertTriangle, Building2, SlidersHorizontal } from 'lucide-react'
type KYCLevel = 'TIER_1' | 'TIER_2' | 'TIER_3'

export interface HeaderProps {
  onOpenSendMoney?: () => void
  onOpenChaosSimulator?: () => void
}

function getTierBadgeVariant(tier?: KYCLevel): 'tier1' | 'tier2' | 'tier3' {
  if (tier === 'TIER_1') return 'tier1'
  if (tier === 'TIER_3') return 'tier3'
  return 'tier2'
}

function formatTierLabel(tier?: KYCLevel): string {
  if (tier === 'TIER_1') return 'Tier 1'
  if (tier === 'TIER_3') return 'Tier 3 (Uncapped)'
  return 'Tier 2 (₦300k/day)'
}

export function Header({ onOpenSendMoney, onOpenChaosSimulator }: HeaderProps) {
  const { theme, toggleTheme, chaos } = useAppStore()
  const { data: wallet, isError: isWalletError } = useWalletSummary()
  const isFetchingCount = useIsFetching()

  const [isBrowserOnline, setIsBrowserOnline] = React.useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  React.useEffect(() => {
    function handleOnline() {
      setIsBrowserOnline(true)
    }
    function handleOffline() {
      setIsBrowserOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const isOffline = !isBrowserOnline || chaos.isSimulatedOffline
  const isRetrying = isWalletError && isFetchingCount > 0
  const showConnectivityWarning = isOffline || isRetrying

  const merchantName = wallet?.merchantName ?? 'NovaBiz Merchant'
  const kycTier = wallet?.kycTier ?? 'TIER_2'

  return (
    <header className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors">
      {/* Low-Connectivity / Offline Banner */}
      {showConnectivityWarning && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5">
          <div className="max-w-7xl mx-auto">
            <Alert variant="warning" className="border-none bg-transparent p-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-xs sm:text-sm">
                  <AlertTitle className="font-semibold text-amber-900 dark:text-amber-200 mb-0">
                    Poor connectivity detected.
                  </AlertTitle>
                  <AlertDescription className="text-amber-800 dark:text-amber-300">
                    Retrying automatically... For urgent transfers without data, dial{' '}
                    <span className="font-bold underline tracking-wider">*894#</span>.
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </div>
        </div>
      )}

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-auto sm:h-20 py-3 sm:py-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        {/* Left: Branding & Merchant info */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm font-bold text-lg">
            NB
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                {merchantName}
              </span>
              <Badge variant={getTierBadgeVariant(kycTier)} className="text-[11px] font-medium">
                {formatTierLabel(kycTier)}
              </Badge>
              {chaos.isSimulatedOffline && (
                <Badge variant="failed" className="text-[10px] gap-1 py-0 px-1.5">
                  <WifiOff className="h-3 w-3" /> Offline Sim
                </Badge>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              FirstBank NovaPay • MID: {wallet?.merchantId ?? 'MID-00123456'}
            </span>
          </div>
        </div>

        {/* Right: Actions, Theme Toggle & Send Money */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          {/* Chaos Simulator Trigger */}
          {onOpenChaosSimulator && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenChaosSimulator}
              className="h-9 px-2.5 text-xs text-gray-600 dark:text-gray-300"
              title="Open Network Chaos Simulator"
              aria-label="Open Network Chaos Simulator"
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5 text-brand-600 dark:text-brand-400" />
              <span className="hidden xs:inline">Chaos</span>
            </Button>
          )}

          {/* Dark Mode Switch */}
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
            <Sun className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              aria-label="Toggle dark mode"
            />
            <Moon className="h-3.5 w-3.5 text-brand-400" aria-hidden="true" />
          </div>

          {/* Primary Send Money Button */}
          <Button
            variant="default"
            size="default"
            onClick={onOpenSendMoney}
            className="shadow-sm font-semibold text-sm bg-brand-600 hover:bg-brand-700 text-white min-w-[120px]"
          >
            <Send className="h-4 w-4 mr-1.5" />
            Send Money
          </Button>
        </div>
      </div>
    </header>
  )
}
