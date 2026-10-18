import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/ui/dialog'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'
import { Badge } from '@/ui/badge'
import { Alert } from '@/ui/alert'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/ui/select'
import { Card, CardContent } from '@/ui/card'
import { useWalletSummary } from '@/hooks/useDashboardData'
import { useSendMoney, NIP_FEE_KOBO } from '@/hooks/useSendMoney'
import { getBanks, resolveAccount, type BankItem } from '@/lib/api'
import {
  formatKoboToNaira,
  parseNairaInputToKobo,
  addKobo,
  subtractKobo,
} from '@/utils/currency'
import { sanitizeNarration, sanitizeDisplayName } from '@/utils/sanitize'
import type { SendMoneyPayload, Kobo } from '@/types/domain'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  KeyRound,
  Building,
  CreditCard,
} from 'lucide-react'

export interface SendMoneyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 'recipient' | 'amount' | 'review' | 'success'

const FALLBACK_BANKS: BankItem[] = [
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'Access Bank', code: '044' },
  { name: 'United Bank for Africa', code: '033' },
  { name: 'Kuda Bank', code: '090267' },
  { name: 'Moniepoint Microfinance Bank', code: '50515' },
  { name: 'OPay Digital Services', code: '100004' },
]

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function SendMoneyModal({ open, onOpenChange }: SendMoneyModalProps) {
  const { data: wallet } = useWalletSummary()

  // Form State
  const [step, setStep] = React.useState<Step>('recipient')

  // Step 1: Recipient
  const [banks, setBanks] = React.useState<BankItem[]>(FALLBACK_BANKS)
  const [selectedBankCode, setSelectedBankCode] = React.useState<string>('011')
  const [accountNumber, setAccountNumber] = React.useState<string>('')
  const [recipientName, setRecipientName] = React.useState<string>('')
  const [isResolvingAccount, setIsResolvingAccount] = React.useState<boolean>(false)
  const [resolveError, setResolveError] = React.useState<string>('')

  // Step 2: Amount & Narration
  const [amountInput, setAmountInput] = React.useState<string>('')
  const [amountKobo, setAmountKobo] = React.useState<number>(0)
  const [amountError, setAmountError] = React.useState<string>('')
  const [narration, setNarration] = React.useState<string>('')

  // Step 3: Review & Idempotency Key
  const [idempotencyKey, setIdempotencyKey] = React.useState<string>('')
  const [pin, setPin] = React.useState<string>('')
  const [pinError, setPinError] = React.useState<string>('')

  // Transfer Mutation with Optimistic Reconciliation
  const sendMoneyMutation = useSendMoney({
    onSuccess: () => {
      setStep('success')
    },
    onError: (err) => {
      setPinError(err.message || 'Transfer failed. Your balance has been restored.')
    },
  })

  // Load banks list on open
  React.useEffect(() => {
    if (open) {
      getBanks()
        .then((b) => {
          if (b && b.length > 0) setBanks(b)
        })
        .catch(() => {
          setBanks(FALLBACK_BANKS)
        })
    }
  }, [open])

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setStep('recipient')
      setAccountNumber('')
      setRecipientName('')
      setResolveError('')
      setAmountInput('')
      setAmountKobo(0)
      setAmountError('')
      setNarration('')
      setIdempotencyKey('')
      setPin('')
      setPinError('')
    }
  }, [open])

  // Step 1: Auto-resolve NUBAN when 10 digits are entered
  React.useEffect(() => {
    const cleanAccount = accountNumber.trim()
    if (cleanAccount.length === 10 && /^\d{10}$/.test(cleanAccount) && selectedBankCode) {
      setIsResolvingAccount(true)
      setResolveError('')
      setRecipientName('')

      resolveAccount(cleanAccount, selectedBankCode)
        .then((res) => {
          setRecipientName(res.accountName)
          setIsResolvingAccount(false)
        })
        .catch((err: Error) => {
          setResolveError(err.message || 'Could not verify account name with NIBSS')
          setIsResolvingAccount(false)
        })
    } else {
      setRecipientName('')
      setResolveError('')
    }
  }, [accountNumber, selectedBankCode])

  // Step 2 Amount Validator
  function validateAmount(input: string): boolean {
    const parsed = parseNairaInputToKobo(input)
    if (Number.isNaN(parsed) || !Number.isSafeInteger(parsed)) {
      setAmountError('Enter a valid amount in Naira (e.g. 5,000.00)')
      setAmountKobo(0)
      return false
    }

    // Minimum ₦100.00 (10,000 kobo)
    if (parsed <= 10000) {
      setAmountError('Transfer amount must be greater than ₦100.00 (10,000 kobo)')
      setAmountKobo(parsed)
      return false
    }

    const availableKobo = wallet?.availableBalanceKobo ?? 0
    const totalRequiredKobo = parsed + NIP_FEE_KOBO

    if (totalRequiredKobo > availableKobo) {
      setAmountError(
        `Insufficient funds. Total debit with fee is ${formatKoboToNaira(
          totalRequiredKobo,
        )}, exceeding available balance (${formatKoboToNaira(availableKobo)})`,
      )
      setAmountKobo(parsed)
      return false
    }

    const limitRemaining = wallet?.dailyLimitRemainingKobo ?? 0
    if (parsed > limitRemaining) {
      setAmountError(
        `Exceeds daily transfer limit. Remaining limit: ${formatKoboToNaira(limitRemaining)}`,
      )
      setAmountKobo(parsed)
      return false
    }

    setAmountError('')
    setAmountKobo(parsed)
    return true
  }

  // Handle Step 1 -> Step 2
  function handleRecipientSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!recipientName) {
      setResolveError('Please enter a valid 10-digit NUBAN to resolve beneficiary name')
      return
    }
    setStep('amount')
  }

  // Handle Step 2 -> Step 3 (Generates & Locks Idempotency Key)
  function handleAmountSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateAmount(amountInput)) return

    // CRITICAL: Generate idempotency-key when entering the review step if not already locked
    if (!idempotencyKey) {
      setIdempotencyKey(generateUUID())
    }
    setStep('review')
  }

  // Handle Step 3 -> Confirm Transfer
  function handleConfirmSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pin || pin.length < 4) {
      setPinError('Please enter your 4-digit transaction PIN')
      return
    }
    setPinError('')

    const payload: SendMoneyPayload = {
      recipientAccount: accountNumber.trim(),
      recipientBankCode: selectedBankCode,
      recipientName: sanitizeDisplayName(recipientName),
      amountKobo: amountKobo as Kobo,
      narration: sanitizeNarration(narration),
      pin: pin.trim(),
      idempotencyKey,
    }

    sendMoneyMutation.mutate(payload)
  }

  const selectedBank = banks.find((b) => b.code === selectedBankCode)
  const totalDebitKobo = amountKobo > 0 ? addKobo(amountKobo, NIP_FEE_KOBO) : 0
  const availableBalance = wallet?.availableBalanceKobo ?? 0
  const projectedBalanceKobo =
    availableBalance >= totalDebitKobo ? subtractKobo(availableBalance, totalDebitKobo) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              Send Money (NIP)
            </DialogTitle>
            {step !== 'success' && (
              <Badge variant="outline" className="text-[11px] capitalize">
                Step {step === 'recipient' ? '1 of 3' : step === 'amount' ? '2 of 3' : '3 of 3'}
              </Badge>
            )}
          </div>
          <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
            Instant NIBSS NIP inter-bank settlement. Zero floating-point drift.
          </DialogDescription>
        </DialogHeader>

        {/* ── STEP 1: RECIPIENT ────────────────────────────────────────── */}
        {step === 'recipient' && (
          <form onSubmit={handleRecipientSubmit} className="space-y-4 py-2">
            {/* Destination Bank Select */}
            <div className="space-y-1.5">
              <Label htmlFor="bank-select" className="text-xs font-semibold">
                Destination Bank
              </Label>
              <Select
                value={selectedBankCode}
                onValueChange={(val) => {
                  setSelectedBankCode(val)
                  setRecipientName('')
                  setResolveError('')
                }}
              >
                <SelectTrigger id="bank-select" className="h-10 text-sm">
                  <SelectValue placeholder="Select Bank" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {banks.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 10-Digit NUBAN Account */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="account-input" className="text-xs font-semibold">
                  10-Digit NUBAN Account
                </Label>
                {accountNumber.length > 0 && (
                  <span className="text-[11px] text-gray-400 font-mono">
                    {accountNumber.length}/10
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  id="account-input"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{10}"
                  maxLength={10}
                  placeholder="e.g. 0123456789"
                  value={accountNumber}
                  onChange={(e) => {
                    const onlyNums = e.target.value.replace(/\D/g, '')
                    setAccountNumber(onlyNums)
                  }}
                  hasError={Boolean(resolveError)}
                  aria-describedby={
                    resolveError
                      ? 'account-error'
                      : recipientName
                        ? 'account-resolved'
                        : undefined
                  }
                  className="font-mono tracking-wider h-10 text-sm"
                  autoFocus
                />
                {isResolvingAccount && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                  </div>
                )}
              </div>

              {/* Resolved Beneficiary Banner */}
              {recipientName && (
                <div
                  id="account-resolved"
                  role="status"
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-xs text-green-800 dark:text-green-300"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">{recipientName}</span>
                    <span className="text-[11px] text-green-700 dark:text-green-400">
                      Verified NIBSS Beneficiary • {selectedBank?.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {resolveError && (
                <p
                  id="account-error"
                  role="alert"
                  className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {resolveError}
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={!recipientName || isResolvingAccount}
                className="w-full sm:w-auto"
              >
                Continue
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ── STEP 2: AMOUNT & NARRATION ──────────────────────────────── */}
        {step === 'amount' && (
          <form onSubmit={handleAmountSubmit} className="space-y-4 py-2">
            {/* Recipient summary badge */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0" />
                <div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 block">
                    {recipientName}
                  </span>
                  <span className="text-gray-500 text-[11px]">
                    {selectedBank?.name} • {accountNumber}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep('recipient')}
                className="h-7 text-xs text-brand-600 px-2"
              >
                Change
              </Button>
            </div>

            {/* Naira Amount Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="amount-input" className="text-xs font-semibold">
                  Transfer Amount (₦)
                </Label>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Available: {formatKoboToNaira(wallet?.availableBalanceKobo ?? 0)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                  ₦
                </span>
                <Input
                  id="amount-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value)
                    validateAmount(e.target.value)
                  }}
                  hasError={Boolean(amountError)}
                  aria-describedby={amountError ? 'amount-error' : undefined}
                  className="pl-8 font-mono text-base font-semibold h-11"
                  autoFocus
                />
              </div>

              {amountError && (
                <p
                  id="amount-error"
                  role="alert"
                  className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {amountError}
                </p>
              )}

              <div className="flex justify-between text-[11px] text-gray-400 pt-1">
                <span>Min: ₦100.00 (10,000 kobo)</span>
                <span>NIP Fee: {formatKoboToNaira(NIP_FEE_KOBO)}</span>
              </div>
            </div>

            {/* Narration Input */}
            <div className="space-y-1.5">
              <Label htmlFor="narration-input" className="text-xs font-semibold">
                Narration / Note (Optional)
              </Label>
              <Input
                id="narration-input"
                type="text"
                maxLength={100}
                placeholder="e.g. Payment for goods"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="h-10 text-sm"
              />
              <span className="text-[10px] text-gray-400">
                Untrusted inputs are sanitized against XSS.
              </span>
            </div>

            <DialogFooter className="flex justify-between items-center sm:justify-between w-full pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep('recipient')}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={Boolean(amountError) || amountKobo <= 10000}
              >
                Review Transfer
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ── STEP 3: REVIEW & PIN ────────────────────────────────────── */}
        {step === 'review' && (
          <form onSubmit={handleConfirmSubmit} className="space-y-4 py-2">
            <Card className="border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              <CardContent className="p-4 space-y-2.5 text-xs">
                {/* Beneficiary */}
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <span className="text-gray-500">Beneficiary</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 text-right">
                    {recipientName}
                  </span>
                </div>

                {/* Bank & Account */}
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <span className="text-gray-500">Destination</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200">
                    {selectedBank?.name} • {accountNumber}
                  </span>
                </div>

                {/* Transfer Amount */}
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-bold text-gray-900 dark:text-gray-100 font-mono text-sm">
                    {formatKoboToNaira(amountKobo)}
                  </span>
                </div>

                {/* NIP Fee */}
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <span className="text-gray-500">NIP Fee</span>
                  <span className="font-mono text-gray-600 dark:text-gray-400">
                    {formatKoboToNaira(NIP_FEE_KOBO)}
                  </span>
                </div>

                {/* Total Debit */}
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    Total Debit
                  </span>
                  <span className="font-bold text-brand-700 dark:text-brand-300 font-mono text-sm">
                    {formatKoboToNaira(totalDebitKobo)}
                  </span>
                </div>

                {/* Projected Balance */}
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <span className="text-gray-500">Projected Balance</span>
                  <span className="font-mono text-gray-600 dark:text-gray-400">
                    {formatKoboToNaira(projectedBalanceKobo)}
                  </span>
                </div>

                {/* Idempotency Key Badge */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-400 text-[11px] flex items-center gap-1">
                    <Shield className="h-3 w-3 text-emerald-500" />
                    Idempotency Key
                  </span>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] max-w-[200px] truncate"
                    title={idempotencyKey}
                  >
                    {idempotencyKey.slice(0, 18)}...
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Transaction PIN Input */}
            <div className="space-y-1.5">
              <Label htmlFor="pin-input" className="text-xs font-semibold flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5 text-gray-500" />
                Enter 4-Digit Transaction PIN
              </Label>
              <Input
                id="pin-input"
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setPin(val)
                }}
                hasError={Boolean(pinError)}
                aria-describedby={pinError ? 'pin-error' : undefined}
                className="font-mono tracking-widest text-center text-lg h-11"
                autoFocus
              />

              {pinError && (
                <p
                  id="pin-error"
                  role="alert"
                  className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 mt-1"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {pinError}
                </p>
              )}
              <p className="text-[10px] text-gray-400">
                Demo PIN: any 4 digits (e.g. 1234). PIN 0000 tests wrong PIN rejection.
              </p>
            </div>

            <DialogFooter className="flex justify-between items-center sm:justify-between w-full pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep('amount')}
                disabled={sendMoneyMutation.isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={pin.length < 4 || sendMoneyMutation.isPending}
                className="bg-brand-600 hover:bg-brand-700 text-white min-w-[140px]"
              >
                {sendMoneyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Confirm & Send
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ── STEP 4: SUCCESS ─────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="py-6 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-950/60 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Transfer Sent!
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatKoboToNaira(amountKobo)} transferred to {recipientName}.
              </p>
            </div>

            <Alert variant="default" className="text-left text-xs bg-gray-50 dark:bg-gray-900">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Destination</span>
                  <span className="font-semibold">{selectedBank?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account</span>
                  <span className="font-mono">{accountNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Idempotency Key</span>
                  <span className="font-mono text-[10px]">{idempotencyKey.slice(0, 18)}...</span>
                </div>
              </div>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
