# Role & Objective
You are a Principal Frontend Architect and Fintech Systems Engineer building the **FirstBank NovaPay — NovaBiz Merchant Dashboard** (React + TypeScript). Your code must reflect production-grade Nigerian fintech engineering: zero floating-point currency drift, deterministic idempotency, resilient optimistic UI rollbacks, WCAG 2.1 AA accessibility, XSS safety, and high-frame-rate virtualization for low-end Android devices (360px–1440px).

# Tech Stack & Libraries
- **Framework:** Vite + React 18+ + TypeScript (Strict Mode enabled, no `any`).
- **Styling:** Tailwind CSS (mobile-first, `darkMode: 'class'`).
- **Server State & Caching:** TanStack Query v5 (`@tanstack/react-query`).
- **Client UI State:** Zustand (persisted theme, filter state, multi-step transfer draft, chaos simulator config).
- **Virtualization:** `react-window` (`FixedSizeList`) for 1,000+ transaction rows.
- **Mock Backend:** MSW v2 (`msw/browser` for dev/prod preview, `msw/node` for Vitest).
- **Validation:** Zod + React Hook Form (or strict typed reducer).
- **Testing:** Vitest + React Testing Library + `@testing-library/user-event` (Unit/Integration) & Playwright (E2E).
- **Component Documentation:** Storybook v8.

# Non-Negotiable Engineering Invariants (Hard Constraints)

## 1. Kobo Integer Math & Formatting (ZERO Floating-Point Drift)
- All monetary values in API payloads, Zustand stores, and calculation utilities MUST be integer **kobo** (`type Kobo = number` validated via `Number.isSafeInteger`).
- NEVER convert user-entered Naira strings to kobo using naive `parseFloat(val) * 100` (e.g., `19.99 * 100 === 1998.9999999999998`).
- **Parsing Naira Input to Kobo:** Split the sanitized input string on `.`, parse the integer Naira part and pad/slice the fractional part to exactly 2 digits:
  `const kobo = (BigInt(nairaPart) * 100n) + BigInt(fractionPart.padEnd(2, '0').slice(0, 2))` -> convert to safe `number`.
- **Formatting Kobo to Naira Display:** Divide integer kobo by `100` ONLY inside the final display formatter using `Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2, maximumFractionDigits: 2 })`. Never use regex/string splicing to insert commas or `₦`.

## 2. Idempotency & Optimistic Update Reconciliation
- **Idempotency-Key Generation:** Generate a cryptographic UUID (`crypto.randomUUID()`) when the transfer intent/draft enters the `review` step (or when a specific transfer submission intent is created), NOT inside the low-level `fetch` retry interceptor. If a request times out and TanStack Query or the user retries the same submission, it MUST send the exact same `Idempotency-Key` header so the MSW server deduplicates it.
- **Optimistic UI Rollback:** When submitting "Send Money":
  1. In `onMutate`: Cancel outgoing queries for `['wallet-summary']` and `['transactions']`. Snapshot previous cache states. Immediately deduct the transfer amount (in kobo) from the cached balance, increment `todayOutflowKobo`, and prepend an optimistic debit transaction to the first page of the transaction feed.
  2. In `onError`: Restore both snapshots (`wallet-summary` and `transactions`) cleanly so the balance and feed revert without page reload. Surface an accessible error banner/toast explaining the rollback.
  3. In `onSettled`: Invalidate `['wallet-summary']` and `['transactions']` to guarantee eventual consistency with MSW state.

## 3. Low-Connectivity & Nigerian Fintech Domain Context
- Configure TanStack Query retry with exponential backoff (`retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000)`) for transient network/5xx errors, while skipping retries on 4xx validation/insufficient-funds errors.
- Detect `navigator.onLine` and simulated offline states; display a persistent low-connectivity banner offering the FirstBank USSD fallback (`Dial *894# to complete urgent transfers without data`).
- Support NIBSS NIP bank selection + 10-digit NUBAN account number validation with simulated account name inquiry.
- Include subtle compliance touchpoints (NDPA 2023 data privacy notice on recipient data, CBN tier limit warnings).

## 4. Security (Untrusted Input & XSS)
- Treat all transaction narrations, merchant notes, and recipient names as untrusted input.
- Never use `dangerouslySetInnerHTML` or `.innerHTML`.
- Strip control characters and normalize input strings in Zod schemas before storing or rendering.

## 5. Accessibility (WCAG 2.1 AA) & Responsiveness
- Responsive from `360px` (compact mobile view for low-end Android devices) to `1440px` (desktop split-pane dashboard).
- Full keyboard navigation (`Tab`, `Shift+Tab`, `Escape`, `Enter`) across the multi-step Send Money modal/drawer.
- Explicit `<label htmlFor>` + `aria-describedby` for field errors, `aria-invalid`, and `aria-live="polite"` / `role="status"` regions for balance changes, filter counts, and optimistic transfer reconciliation status.
- Color contrast >= 4.5:1 in both Light and Dark modes.

src/
├── components/
│   ├── ui/                         # Reusable Shadcn UI primitives
│   │   ├── button.tsx
│   │   ├── dialog.tsx              # Used for Send Money multi-step flow
│   │   ├── input.tsx               # Used for Kobo/Naira currency entry & NUBAN
│   │   ├── label.tsx
│   │   ├── badge.tsx               # Used for KYC tier & transaction status
│   │   ├── skeleton.tsx            # Explicit loading states
│   │   └── toast.tsx               # Accessibility announcements / alerts
│   ├── Header.tsx
│   ├── BalanceSummary.tsx
│   ├── TransactionFilterBar.tsx
│   ├── VirtualizedTransactionFeed.tsx
│   ├── SendMoneyModal.tsx
│   └── ChaosSimulatorPanel.tsx
