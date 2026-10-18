/**
 * MSW Mock Database — NovaBiz Merchant Dashboard
 *
 * Generates 1,250 realistic Nigerian merchant transactions seeded
 * deterministically with a simple LCG PRNG (no external deps, reproducible).
 * Sorted newest-first. Includes XSS probe strings to validate sanitization.
 *
 * All monetary values are integer KOBO (1 Naira = 100 kobo).
 */
import type { Transaction, WalletSummary, Kobo } from '@/types/domain'

// ---------------------------------------------------------------------------
// Deterministic PRNG (Linear Congruential Generator)
// ---------------------------------------------------------------------------
function makePrng(seed: number) {
  let s = seed
  return function rand(): number {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

// ---------------------------------------------------------------------------
// Static data pools
// ---------------------------------------------------------------------------

const NIGERIAN_BANKS = [
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'Guaranty Trust Bank', code: '058' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'Access Bank', code: '044' },
  { name: 'United Bank for Africa', code: '033' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Union Bank of Nigeria', code: '032' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Kuda Bank', code: '090267' },
  { name: 'OPay Digital Services', code: '100004' },
  { name: 'Moniepoint Microfinance Bank', code: '50515' },
  { name: 'PalmPay', code: '100033' },
  { name: 'Polaris Bank', code: '076' },
]

const NIGERIAN_FIRST_NAMES = [
  'Adaeze', 'Chukwuemeka', 'Oluwaseun', 'Fatima', 'Ibrahim', 'Ngozi',
  'Babatunde', 'Amina', 'Chidi', 'Yetunde', 'Emeka', 'Blessing',
  'Musa', 'Chidinma', 'Adewale', 'Hauwa', 'Ekene', 'Taiwo',
  'Kehinde', 'Obinna', 'Zainab', 'Tochukwu', 'Femi', 'Aisha',
  'Nnamdi', 'Folake', 'Uche', 'Chiamaka', 'Bode', 'Ifeoma',
]

const NIGERIAN_LAST_NAMES = [
  'Okonkwo', 'Adeleke', 'Musa', 'Ibrahim', 'Okafor', 'Adeyemi',
  'Eze', 'Balogun', 'Chukwu', 'Adesanya', 'Nwosu', 'Danjuma',
  'Obi', 'Lawal', 'Onyekachi', 'Suleiman', 'Aneke', 'Fashola',
  'Okeke', 'Buhari', 'Nwachukwu', 'Adekunle', 'Chima', 'Yakubu',
]

const NARRATIONS = [
  'Payment for stock replenishment',
  'Transfer for business supplies',
  'POS collection — retail sales',
  'USSD transfer from customer',
  'NIP inflow from partner',
  'Vendor payment — bulk goods',
  'Salary disbursement',
  'School fees payment',
  'Rent collection via QR',
  'Hospital bill settlement',
  'Restaurant revenue — weekend',
  'Market stall POS income',
  'Fuel station NIP credit',
  'Airtime reseller credit',
  'Supermarket checkout receipt',
  'Logistics and delivery fee',
  'Commission inflow from agent',
  'Event ticket revenue',
  'Online store settlement',
  'Utility bill payment',
  // XSS probe strings — must be sanitised before display
  '<img src=x onerror=alert(1)> Payment for stock',
  '<script>alert("xss")</script> Transfer',
  'javascript:void(0) — suspicious narration',
  '<b>Bold</b> vendor payment description',
  'Transfer\x00 with\x1B[31m null byte test',
  '&#60;img&#62; HTML entity injection test',
]

const CHANNELS: Array<Transaction['channel']> = ['NIP', 'POS_QR', 'USSD']
const STATUSES: Array<Transaction['status']> = ['successful', 'successful', 'successful', 'pending', 'failed']
const TYPES: Array<Transaction['type']> = ['credit', 'credit', 'debit', 'debit']

// ---------------------------------------------------------------------------
// NUBAN generator (10-digit string)
// ---------------------------------------------------------------------------
function genNuban(rand: () => number): string {
  return Array.from({ length: 10 }, () => Math.floor(rand() * 10)).join('')
}

// ---------------------------------------------------------------------------
// Amount pools (integer kobo)
// ---------------------------------------------------------------------------
// Amounts range from ₦50 (5000 kobo) to ₦500,000 (50,000,000 kobo)
function genAmountKobo(rand: () => number): Kobo {
  const nairaAmounts = [
    50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 500000,
  ]
  const base = nairaAmounts[Math.floor(rand() * nairaAmounts.length)]
  // Add random kobo component for realism
  const koboFraction = Math.floor(rand() * 100)
  return (base * 100 + koboFraction) as Kobo
}

// ---------------------------------------------------------------------------
// Transaction seed
// ---------------------------------------------------------------------------

const TOTAL_TRANSACTIONS = 1250
const rand = makePrng(0xdeadbeef)

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

function genTransaction(index: number): Transaction {
  const status = pick(STATUSES)
  const type = pick(TYPES)
  const bank = pick(NIGERIAN_BANKS)
  const firstName = pick(NIGERIAN_FIRST_NAMES)
  const lastName = pick(NIGERIAN_LAST_NAMES)
  const amountKobo = genAmountKobo(rand)
  const feeKobo = status === 'successful' && type === 'debit'
    ? ([5300, 10750, 5300, 0] as Kobo[])[Math.floor(rand() * 4)]
    : 0 as Kobo

  // createdAt: spread transactions over the past 18 months
  const now = Date.now()
  const eighteenMonthsAgo = now - 18 * 30 * 24 * 60 * 60 * 1000
  const createdAt = new Date(
    Math.floor(eighteenMonthsAgo + rand() * (now - eighteenMonthsAgo)),
  ).toISOString()

  const channel = pick(CHANNELS)
  const narration = pick(NARRATIONS)

  // Prefix reference with channel code
  const refPrefix = { NIP: 'NIP', POS_QR: 'POS', USSD: 'USD' }[channel]
  const refSuffix = Math.floor(rand() * 1e12).toString().padStart(12, '0')

  return {
    id: `txn-${(index + 1).toString().padStart(5, '0')}`,
    reference: `${refPrefix}${refSuffix}`,
    type,
    status,
    amountKobo,
    feeKobo,
    counterpartyName: `${firstName} ${lastName}`,
    counterpartyBank: bank.name,
    counterpartyAccount: genNuban(rand),
    narration,
    channel,
    createdAt,
  }
}

// Generate and sort newest-first
export const seedTransactions: Transaction[] = Array.from(
  { length: TOTAL_TRANSACTIONS },
  (_, i) => genTransaction(i),
).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

// ---------------------------------------------------------------------------
// Wallet summary (in integer kobo)
// availableBalanceKobo: 48525050 → ₦485,250.50
// ---------------------------------------------------------------------------
export let walletSummary: WalletSummary = {
  availableBalanceKobo: 48_525_050 as Kobo,
  ledgerBalanceKobo: 51_200_000 as Kobo,
  todayInflowKobo: 3_875_000 as Kobo,
  todayOutflowKobo: 1_245_200 as Kobo,
  merchantName: 'NovaBiz Enterprises Ltd',
  merchantId: 'MID-00123456',
  kycTier: 'TIER_2',
  dailyLimitRemainingKobo: (30_000_000 - 1_245_200) as Kobo, // TIER_2 cap = ₦300,000/day
}

/**
 * Mutates the in-memory wallet summary after a successful transfer.
 * Called from handlers.ts onSettled to keep the mock consistent.
 */
export function deductFromWallet(amountKobo: number, feeKobo: number): void {
  const total = amountKobo + feeKobo
  walletSummary = {
    ...walletSummary,
    availableBalanceKobo: (walletSummary.availableBalanceKobo - total) as Kobo,
    ledgerBalanceKobo: (walletSummary.ledgerBalanceKobo - total) as Kobo,
    todayOutflowKobo: (walletSummary.todayOutflowKobo + total) as Kobo,
    dailyLimitRemainingKobo: (walletSummary.dailyLimitRemainingKobo - amountKobo) as Kobo,
  }
}

/**
 * Prepends a new (confirmed) transaction to the in-memory list.
 */
export function prependTransaction(txn: Transaction): void {
  seedTransactions.unshift(txn)
}

// ---------------------------------------------------------------------------
// Nigerian bank directory — used by GET /api/banks/list
// ---------------------------------------------------------------------------
export const bankDirectory = NIGERIAN_BANKS

const INITIAL_SEED_TRANSACTIONS: Transaction[] = [...seedTransactions]
const INITIAL_WALLET_SUMMARY: WalletSummary = { ...walletSummary }

export function resetMockDb(): void {
  walletSummary = { ...INITIAL_WALLET_SUMMARY }
  seedTransactions.length = 0
  seedTransactions.push(...INITIAL_SEED_TRANSACTIONS)
}

