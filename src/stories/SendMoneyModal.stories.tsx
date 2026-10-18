import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SendMoneyModal } from '@/components/SendMoneyModal'
import { Button } from '@/ui/button'
import { WALLET_QUERY_KEY } from '@/hooks/useDashboardData'
import type { WalletSummary, Kobo } from '@/types/domain'
import { Send } from 'lucide-react'

const mockWallet: WalletSummary = {
  merchantId: 'MID-00123456',
  merchantName: 'NovaBiz Enterprises Ltd',
  kycTier: 'TIER_2',
  availableBalanceKobo: 48525050 as Kobo, // ₦485,250.50
  ledgerBalanceKobo: 48525050 as Kobo,
  todayInflowKobo: 12500000 as Kobo,
  todayOutflowKobo: 4500000 as Kobo,
  dailyLimitRemainingKobo: 30000000 as Kobo,
}

const meta: Meta<typeof SendMoneyModal> = {
  title: 'Dashboard/SendMoneyModal',
  component: SendMoneyModal,
  parameters: {
    layout: 'centered',
  },
}

export default meta

function InteractiveSendMoney() {
  const [open, setOpen] = React.useState(true)

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <Button
        onClick={() => setOpen(true)}
        className="bg-brand-600 hover:bg-brand-700 text-white"
      >
        <Send className="h-4 w-4 mr-2" />
        Open Send Money Modal
      </Button>
      <p className="text-xs text-gray-500">
        Demo NUBAN: <code className="font-mono font-semibold">0123456789</code> • PIN: <code className="font-mono font-semibold">1234</code>
      </p>

      <SendMoneyModal open={open} onOpenChange={setOpen} />
    </div>
  )
}

export const InteractiveTransfer: StoryObj = {
  render: () => {
    const client = new QueryClient()
    client.setQueryData(WALLET_QUERY_KEY, mockWallet)

    return (
      <QueryClientProvider client={client}>
        <InteractiveSendMoney />
      </QueryClientProvider>
    )
  },
}
