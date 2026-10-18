/**
 * NovaBiz Merchant Dashboard — Core Domain Types
 *
 * All monetary values are stored as integer kobo (1 Naira = 100 kobo).
 * Use the utilities in `src/utils/currency.ts` to format/parse values.
 * Never store floats; never multiply naira by 100 directly.
 */

// ---------------------------------------------------------------------------
// Primitive branded / strict types
// ---------------------------------------------------------------------------

/**
 * Integer kobo value. Must satisfy `Number.isSafeInteger(value)`.
 * Use `assertKobo()` from currency utils to validate at runtime boundaries.
 *
 * Using a branded type pattern so TypeScript prevents accidental use of raw
 * `number` where a kobo value is expected without explicit assertion.
 */
// export type Kobo = number & { readonly __brand: 'Kobo' }

// export type TransactionType = 'credit' | 'debit'

// export type TransactionStatus = 'pending' | 'successful' | 'failed'

// /** CBN KYC tier levels for Nigerian fintech compliance. */
// export type KYCLevel = 'TIER_1' | 'TIER_2' | 'TIER_3'

// /** Payment channel identifiers per NIBSS / CBN classifications. */
// export type PaymentChannel = 'NIP' | 'POS_QR' | 'USSD'

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

/**
 * A single financial transaction on the merchant's NovaBiz wallet.
 *
 * - `amountKobo` and `feeKobo` are always ≥ 0.
 * - `counterpartyAccount` is a 10-digit NUBAN string.
 * - `optimistic` is `true` only for client-side speculative entries that
 *    haven't yet been confirmed by the server; they must be reconciled or
 *    rolled back via TanStack Query's `onSettled` / `onError` handlers.
 */
export interface Transaction {
  /** Opaque server-assigned UUID. */
  id: string
  /** Unique payment reference (e.g. "NIP240101XXXXXXXX"). */
  reference: string
  type: TransactionType
  status: TransactionStatus
  /** Gross transaction amount in integer kobo. */
  amountKobo: Kobo
  /** Processing fee in integer kobo (0 for zero-fee transactions). */
  feeKobo: Kobo
  /** Display name of the counterparty (sender or recipient). */
  counterpartyName: string
  /** Full name of the counterparty's bank. */
  counterpartyBank: string
  /**
   * 10-digit NUBAN account number of the counterparty.
   * Pattern: /^\d{10}$/
   */
  counterpartyAccount: string
  /** Sanitised transaction narration / description. */
  narration: string
  channel: PaymentChannel
  /** ISO 8601 UTC timestamp when the transaction was created server-side. */
  createdAt: string
  /**
   * Present and `true` for speculative (optimistic) entries created during
   * a Send Money mutation before server confirmation arrives.
   */
  optimistic?: boolean
}

// ---------------------------------------------------------------------------
// Wallet Summary
// ---------------------------------------------------------------------------

/**
 * Snapshot of the merchant's wallet state, returned by the balance endpoint.
 * All kobo values must be non-negative integers.
 *
 * `dailyLimitRemainingKobo` reflects the CBN tier-based daily transfer cap
 * minus outflows already executed today.
 */

/**
 * Payload submitted to the /transfer endpoint when a merchant initiates a
 * Send Money transfer.
 *
 * - `pin` is the merchant's 4–6 digit transaction PIN (string, not number,
 *   to preserve leading zeros).
 * - `idempotencyKey` MUST be a `crypto.randomUUID()` generated when the
 *   transfer intent enters the **review** step — not on every retry —
 *   so that the MSW / real server can deduplicate duplicate submissions.
 * - `amountKobo` must be a safe integer > 0.
 */
export interface SendMoneyPayload {
  /** 10-digit NUBAN account number of the recipient. */
  recipientAccount: string
  /** 3-digit CBN bank code (e.g. "011" for FirstBank). */
  recipientBankCode: string
  /** Verified recipient name from account inquiry. */
  recipientName: string
  /** Transfer amount in integer kobo (must be > 0). */
  amountKobo: Kobo
  /** Optional payment narration (max 100 chars, will be sanitised). */
  narration: string
  /** Merchant transaction PIN (4–6 digits). */
  pin: string
  /**
   * RFC 4122 UUID generated once per transfer intent at the review step.
   * Must be re-used on retries for idempotent deduplication.
   */
  idempotencyKey: string
}

// ---------------------------------------------------------------------------
// Pagination helpers (used by transaction list endpoint)
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  total: number
}

export type TransactionPage = PaginatedResponse<Transaction>

// ---------------------------------------------------------------------------
// Transaction Filter types
// ---------------------------------------------------------------------------

export type FilterStatus = 'all' | 'pending' | 'successful' | 'failed'
export type FilterType = 'all' | 'credit' | 'debit'

export interface TransactionFilters {
  status: FilterStatus
  type: FilterType
  /** ISO date string (YYYY-MM-DD) or empty string */
  dateFrom: string
  dateTo: string
  /** Free-text search across narration, counterparty name, reference */
  searchQuery: string
}

export type Kobo = number; // Validated at runtime via Number.isSafeInteger

export type TransactionType = 'credit' | 'debit';
export type TransactionStatus = 'pending' | 'successful' | 'failed';
export type PaymentChannel = 'NIP' | 'POS_QR' | 'USSD';

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  status: TransactionStatus;
  amountKobo: Kobo;
  feeKobo: Kobo;
  counterpartyName: string;
  counterpartyBank: string;
  counterpartyAccount: string;
  narration: string;
  channel: PaymentChannel;
  createdAt: string; // ISO-8601
  optimistic?: boolean;
}

export interface WalletSummary {
  merchantId: string;
  merchantName: string;
  availableBalanceKobo: Kobo;
  ledgerBalanceKobo: Kobo;
  todayInflowKobo: Kobo;
  todayOutflowKobo: Kobo;
  kycTier: 'TIER_1' | 'TIER_2' | 'TIER_3';
  dailyLimitRemainingKobo: Kobo;
}

export interface PaginatedTransactionsResponse {
  items: Transaction[];
  nextCursor: number | null;
  totalCount: number;
}

export interface SendMoneyPayload {
  recipientAccount: string;
  recipientBankCode: string;
  recipientBankName: string;
  recipientName: string;
  amountKobo: Kobo;
  narration: string;
  pin: string;
  idempotencyKey: string;
}

export interface SendMoneyResponse {
  transaction: Transaction;
  updatedBalanceKobo: Kobo;
  deduplicated?: boolean;
}
