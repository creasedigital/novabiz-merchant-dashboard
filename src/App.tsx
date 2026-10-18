import React from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { Header } from '@/components/Header'
import { BalanceSummary } from '@/components/BalanceSummary'
import { TransactionFilterBar } from '@/components/TransactionFilterBar'
import { VirtualizedTransactionFeed } from '@/components/VirtualizedTransactionFeed'
import { SendMoneyModal } from '@/components/SendMoneyModal'
import { ChaosSimulatorPanel } from '@/components/ChaosSimulatorPanel'
import { NetworkChaosDialog } from '@/components/NetworkChaosDialog'
import { Toaster } from '@/ui/toaster'
import { ShieldCheck } from 'lucide-react'

export function DashboardContent() {
  const [isSendMoneyOpen, setIsSendMoneyOpen] = React.useState(false)
  const [isChaosDialogOpen, setIsChaosDialogOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col font-sans transition-colors antialiased">
      {/* Global Header */}
      <Header
        onOpenSendMoney={() => setIsSendMoneyOpen(true)}
        onOpenChaosSimulator={() => setIsChaosDialogOpen(true)}
      />

      {/* Main Container: responsive from 360px (mobile) to 1440px (desktop) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Balance Metric Cards */}
        <BalanceSummary />

        {/* Filter Toolbar */}
        <TransactionFilterBar />

        {/* Virtualized 1,000+ Row Transaction Feed */}
        <VirtualizedTransactionFeed />
      </main>

      {/* Footer & Compliance Notice */}
      <footer className="w-full border-t border-gray-200 dark:border-gray-800 py-6 px-4 bg-white dark:bg-gray-900 mt-auto text-xs text-gray-500 dark:text-gray-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-fbgreen-600 dark:text-fbgreen-500 shrink-0" />
            <span>
              Licensed by the <strong>Central Bank of Nigeria (CBN)</strong> • Insured by <strong>NDIC</strong>
            </span>
          </div>
          <div>
            <span>Compliant with Nigeria Data Protection Act (NDPA 2023) • FirstBank NovaPay v1.0</span>
          </div>
        </div>
      </footer>

      {/* Multi-Step Send Money Modal */}
      <SendMoneyModal
        open={isSendMoneyOpen}
        onOpenChange={setIsSendMoneyOpen}
      />

      {/* Chaos Simulator Modal (header trigger) */}
      <NetworkChaosDialog
        open={isChaosDialogOpen}
        onOpenChange={setIsChaosDialogOpen}
      />

      {/* Floating Bottom-Right Evaluator Chaos Simulator Panel */}
      <ChaosSimulatorPanel />

      {/* Global Accessible Live-Region Toasts */}
      <Toaster />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  )
}
