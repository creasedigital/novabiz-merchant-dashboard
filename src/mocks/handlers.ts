/**
 * MSW v2 Request Handlers — NovaBiz Merchant Dashboard
 *
 * Endpoints:
 *   GET  /api/wallet/summary        — returns WalletSummary
 *   GET  /api/transactions          — paginated, filtered transaction list
 *   GET  /api/banks/list            — list of Nigerian banks for bank selector
 *   GET  /api/banks/resolve         — simulated NUBAN account name inquiry
 *   POST /api/transfers             — send money (idempotent, chaos-aware)
 *
 * Chaos behaviour is read from the `X-Chaos-*` request headers injected by
 * the TanStack Query fetcher (populated from Zustand chaos config):
 *   X-Chaos-Latency-Ms      — extra delay in ms
 *   X-Chaos-Failure-Rate    — float [0,1] probability of 503
 *   X-Chaos-Force-Fail      — '1' to deterministically 503 the next transfer
 *
 * Idempotency:
 *   POST /api/transfers checks the `Idempotency-Key` header against an
 *   in-memory Map. Duplicate keys return the cached response without
 *   re-processing (no double deduction).
 */
import { http, HttpResponse, delay } from 'msw'
import {
  seedTransactions,
  walletSummary,
  deductFromWallet,
  prependTransaction,
  bankDirectory,
} from './db'
import { sanitizeNarration, sanitizeDisplayName } from '@/utils/sanitize'
import type { Transaction, SendMoneyPayload, Kobo } from '@/types/domain'

// ---------------------------------------------------------------------------
// Idempotency store — lives for the duration of the MSW worker's lifetime
// ---------------------------------------------------------------------------
export const idempotencyStore = new Map<string, { status: number; body: unknown }>()

export function resetIdempotencyStore(): void {
  idempotencyStore.clear()
}

// ---------------------------------------------------------------------------
// Chaos helpers
// ---------------------------------------------------------------------------

function getChaosHeaders(req: Request) {
  return {
    latencyMs: Number(req.headers.get('X-Chaos-Latency-Ms') ?? '350'),
    failureRate: Number(req.headers.get('X-Chaos-Failure-Rate') ?? '0'),
    forceFail: req.headers.get('X-Chaos-Force-Fail') === '1',
  }
}

async function applyLatency(ms: number) {
  if (ms > 0) await delay(ms)
}

function shouldFail(failureRate: number): boolean {
  return failureRate > 0 && Math.random() < failureRate
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export const handlers = [

  // ── GET /api/wallet/summary ───────────────────────────────────────────────
  http.get('/api/wallet/summary', async ({ request }) => {
    const { latencyMs, failureRate } = getChaosHeaders(request)
    await applyLatency(latencyMs)

    if (shouldFail(failureRate)) {
      return HttpResponse.json(
        { error: 'Service temporarily unavailable. Please try again.' },
        { status: 503 },
      )
    }

    return HttpResponse.json(walletSummary, { status: 200 })
  }),

  // ── GET /api/transactions ─────────────────────────────────────────────────
  http.get('/api/transactions', async ({ request }) => {
    const { latencyMs, failureRate } = getChaosHeaders(request)
    await applyLatency(latencyMs)

    if (shouldFail(failureRate)) {
      return HttpResponse.json(
        { error: 'Service temporarily unavailable. Please try again.' },
        { status: 503 },
      )
    }

    const url = new URL(request.url)
    const status = url.searchParams.get('status') ?? 'all'
    const type = url.searchParams.get('type') ?? 'all'
    const dateFrom = url.searchParams.get('dateFrom') ?? ''
    const dateTo = url.searchParams.get('dateTo') ?? ''
    const searchQuery = (url.searchParams.get('q') ?? '').toLowerCase()
    const cursor = url.searchParams.get('cursor') ?? null
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 2000)

    // Filter
    let filtered = seedTransactions.filter((txn) => {
      if (status !== 'all' && txn.status !== status) return false
      if (type !== 'all' && txn.type !== type) return false
      if (dateFrom) {
        const from = new Date(dateFrom + 'T00:00:00.000Z').getTime()
        if (new Date(txn.createdAt).getTime() < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo + 'T23:59:59.999Z').getTime()
        if (new Date(txn.createdAt).getTime() > to) return false
      }
      if (searchQuery) {
        const haystack = [
          txn.narration,
          txn.counterpartyName,
          txn.reference,
          txn.counterpartyBank,
        ].join(' ').toLowerCase()
        if (!haystack.includes(searchQuery)) return false
      }
      return true
    })

    // Cursor-based pagination (cursor = createdAt of last seen item)
    if (cursor) {
      const cursorTime = new Date(cursor).getTime()
      const cursorIdx = filtered.findIndex(
        (t) => new Date(t.createdAt).getTime() <= cursorTime,
      )
      filtered = cursorIdx === -1 ? [] : filtered.slice(cursorIdx)
    }

    const page = filtered.slice(0, limit)
    const remaining = filtered.slice(limit)
    const nextCursor = remaining.length > 0 ? page[page.length - 1]?.createdAt ?? null : null

    return HttpResponse.json(
      {
        data: page,
        nextCursor,
        total: seedTransactions.length,
        filteredTotal: filtered.length,
      },
      { status: 200 },
    )
  }),

  // ── GET /api/banks/list ───────────────────────────────────────────────────
  http.get('/api/banks/list', async ({ request }) => {
    const { latencyMs } = getChaosHeaders(request)
    await applyLatency(latencyMs)
    return HttpResponse.json({ banks: bankDirectory }, { status: 200 })
  }),

  // ── GET /api/banks/resolve ────────────────────────────────────────────────
  // Simulates NIBSS NIP account name inquiry (NUBAN lookup)
  http.get('/api/banks/resolve', async ({ request }) => {
    const { latencyMs, failureRate } = getChaosHeaders(request)
    await applyLatency(latencyMs + 600) // NIP lookup is slower in real life

    if (shouldFail(failureRate)) {
      return HttpResponse.json(
        { error: 'Name inquiry failed. Check the account number and try again.' },
        { status: 503 },
      )
    }

    const url = new URL(request.url)
    const account = url.searchParams.get('account') ?? ''
    const bankCode = url.searchParams.get('bankCode') ?? ''

    // Validate NUBAN — must be exactly 10 digits
    if (!/^\d{10}$/.test(account)) {
      return HttpResponse.json(
        { error: 'Invalid account number. Must be exactly 10 digits.' },
        { status: 400 },
      )
    }

    // Simulate bank not found
    const bank = bankDirectory.find((b) => b.code === bankCode)
    if (!bank) {
      return HttpResponse.json(
        { error: 'Bank code not recognised.' },
        { status: 400 },
      )
    }

    // Deterministically derive a fake name from the account number
    const firstNames = ['Adaeze', 'Chukwuemeka', 'Oluwaseun', 'Fatima', 'Ibrahim',
      'Ngozi', 'Babatunde', 'Amina', 'Chidi', 'Yetunde']
    const lastNames = ['Okonkwo', 'Adeleke', 'Musa', 'Ibrahim', 'Okafor',
      'Adeyemi', 'Eze', 'Balogun', 'Chukwu', 'Adesanya']
    const seed = parseInt(account.slice(-3), 10)
    const firstName = firstNames[seed % firstNames.length]
    const lastName = lastNames[Math.floor(seed / 10) % lastNames.length]
    const resolvedName = `${firstName} ${lastName}`

    return HttpResponse.json(
      {
        accountNumber: account,
        accountName: resolvedName,
        bankCode,
        bankName: bank.name,
      },
      { status: 200 },
    )
  }),

  // ── POST /api/transfers ───────────────────────────────────────────────────
  http.post('/api/transfers', async ({ request }) => {
    const { latencyMs, failureRate, forceFail } = getChaosHeaders(request)
    await applyLatency(latencyMs)

    // ── Idempotency check ──
    const idempotencyKey = request.headers.get('Idempotency-Key') ?? ''
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      const cached = idempotencyStore.get(idempotencyKey)!
      return HttpResponse.json(cached.body as Parameters<typeof HttpResponse.json>[0], { status: cached.status })
    }

    // ── Chaos: forced or random failure ──
    if (forceFail || shouldFail(failureRate)) {
      const errBody = {
        error: 'Transfer service temporarily unavailable. Your funds have not been moved.',
        code: 'TRANSFER_SERVICE_UNAVAILABLE',
      }
      if (idempotencyKey) {
        idempotencyStore.set(idempotencyKey, { status: 503, body: errBody })
      }
      return HttpResponse.json(errBody, { status: 503 })
    }

    // ── Parse and validate payload ──
    let payload: SendMoneyPayload
    try {
      payload = (await request.json()) as SendMoneyPayload
    } catch {
      return HttpResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
    }

    const { recipientAccount, recipientBankCode, recipientName, amountKobo, narration, pin } = payload

    if (!recipientAccount || !/^\d{10}$/.test(recipientAccount)) {
      return HttpResponse.json({ error: 'Invalid recipient account number.' }, { status: 400 })
    }
    if (!recipientBankCode) {
      return HttpResponse.json({ error: 'Recipient bank code is required.' }, { status: 400 })
    }
    if (!Number.isSafeInteger(amountKobo) || amountKobo <= 0) {
      return HttpResponse.json({ error: 'Amount must be a positive integer in kobo.' }, { status: 400 })
    }
    if (!pin || !/^\d{4,6}$/.test(pin)) {
      return HttpResponse.json({ error: 'Invalid transaction PIN.' }, { status: 400 })
    }
    // Simulate wrong PIN (PIN "0000" always fails)
    if (pin === '0000') {
      return HttpResponse.json({ error: 'Incorrect transaction PIN.', code: 'WRONG_PIN' }, { status: 403 })
    }

    // ── Insufficient funds check ──
    const fee = 1075 as Kobo // ₦10.75 NIP fee
    if (amountKobo + fee > walletSummary.availableBalanceKobo) {
      const errBody = { error: 'Insufficient funds. Please check your available balance.', code: 'INSUFFICIENT_FUNDS' }
      if (idempotencyKey) {
        idempotencyStore.set(idempotencyKey, { status: 422, body: errBody })
      }
      return HttpResponse.json(errBody, { status: 422 })
    }

    // ── Daily limit check ──
    if (amountKobo > walletSummary.dailyLimitRemainingKobo) {
      const errBody = {
        error: `Daily transfer limit exceeded. You can transfer up to ₦${(walletSummary.dailyLimitRemainingKobo / 100).toLocaleString('en-NG')} more today.`,
        code: 'DAILY_LIMIT_EXCEEDED',
      }
      if (idempotencyKey) {
        idempotencyStore.set(idempotencyKey, { status: 422, body: errBody })
      }
      return HttpResponse.json(errBody, { status: 422 })
    }

    // ── Process transfer ──
    deductFromWallet(amountKobo, fee)

    const bank = bankDirectory.find((b) => b.code === recipientBankCode)
    const sanitisedNarration = sanitizeNarration(narration)
    const sanitisedName = sanitizeDisplayName(recipientName)

    const refSuffix = Math.floor(Math.random() * 1e12).toString().padStart(12, '0')
    const newTxn: Transaction = {
      id: `txn-confirmed-${refSuffix}`,
      reference: `NIP${refSuffix}`,
      type: 'debit',
      status: 'successful',
      amountKobo: amountKobo as Kobo,
      feeKobo: fee,
      counterpartyName: sanitisedName,
      counterpartyBank: bank?.name ?? 'Unknown Bank',
      counterpartyAccount: recipientAccount,
      narration: sanitisedNarration,
      channel: 'NIP',
      createdAt: new Date().toISOString(),
    }

    prependTransaction(newTxn)

    const successBody = {
      transaction: newTxn,
      message: `Transfer of ₦${(amountKobo / 100).toLocaleString('en-NG')} to ${sanitisedName} was successful.`,
    }

    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, { status: 200, body: successBody })
    }

    return HttpResponse.json(successBody, { status: 200 })
  }),
]
