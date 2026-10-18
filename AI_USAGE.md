# AI Usage & Engineering Decision Log — NovaBiz Merchant Dashboard

> Documenting the agentic workflow, tooling choices, verification strategies, prompt interactions, and real-world failure remediations applied during the development of the FirstBank NovaPay — NovaBiz Merchant Dashboard.

---

## 1. AI Tooling & Phased Agentic Strategy

### Tools Used
- **Antigravity (Advanced Agentic AI Assistant powered by Claude 3.5 Sonnet / Gemini Pro)**: Used for multi-step architectural planning, iterative phase execution, test-driven development, and automated error diagnostics.
- **Vite & Vitest Tooling Interceptors**: Real-time terminal feedback for immediate verification of TypeScript types, lint boundaries, and test assertions.

### Why a Phased Agentic Workflow?
Rather than attempting a monolithic code generation pass (which frequently leads to hallucinated dependencies, inconsistent component props, and missing accessibility attributes), development was structured into **6 discrete execution phases**:

1. **Phase 1: Domain & Core Utilities**: Branded TypeScript types (`Kobo`), safe integer currency math, and input sanitizers with pure unit tests.
2. **Phase 2: Accessible Design System & Mock Layer**: Headless Shadcn UI / Radix primitives in `src/ui/`, Zustand store, and MSW v2 simulating Nigerian commercial banking responses and 1,250+ transactions.
3. **Phase 3: Responsive Shell & Virtualization**: Dashboard shell, KPI cards, filter toolbar, and 60fps virtualized feed using `react-window`.
4. **Phase 4: Multi-Step Transfer Flow & Chaos Simulator**: Keyboard-accessible 4-step modal with NIBSS NIP resolution, deterministic idempotency, and interactive chaos panel.
5. **Phase 5: Automated Testing, JSDOM Polyfills & Storybook**: Comprehensive Vitest suites, Playwright E2E tests across Chromium and Mobile (360px), and Storybook stories.
6. **Phase 6: Comprehensive Documentation**: Production README and AI usage audit.

This incremental approach allowed every layer to be compiled and verified with automated test suites before advancing to dependent features.

---

## 2. Three Concrete Prompts & Outputs

### Prompt 1: Currency Parsing & Zero-Drift Invariant
**Prompt Given:**
> *"Create `src/utils/currency.ts` to handle Nigerian Naira and Kobo conversions. We must guarantee zero floating-point drift across all monetary calculations. Implement `formatKoboToNaira(kobo: number): string` using `Intl.NumberFormat('en-NG')` and `parseNairaInputToKobo(input: string): Kobo` using string-split BigInt arithmetic to avoid the IEEE 754 precision bug where `19.99 * 100` yields `1998.9999999999998`. Include safe integer assertions and write a comprehensive Vitest suite covering edge cases, large balances, zero, and decimals."*

**What Came Back:**
- TypeScript utility functions implementing string splitting on the decimal point, padding/slicing fractional cents to 2 digits, and converting to `BigInt` before returning safe numbers.
- A Vitest suite covering 75+ test cases: standard amounts (`₦1,000.50`), trailing decimals (`"50.5"` $\to$ `5050` kobo), clean integers (`"200"` $\to$ `20000` kobo), zero bounds, and negative/invalid inputs.

---

### Prompt 2: Shadcn UI Primitive Scaffolding with WCAG AA Focus Management
**Prompt Given:**
> *"Scaffold the reusable Shadcn UI primitives inside a dedicated `src/ui/` directory: Button, Card, Dialog, Input, Label, Select, Badge, Skeleton, Alert, Switch, Slider, and Popover. Ensure all interactive components have high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-brand-500`) for WCAG 2.1 AA compliance. Add semantic variants to Badge for transaction statuses ('successful', 'pending', 'failed') and KYC tiers ('tier1', 'tier2', 'tier3'). Create `src/lib/utils.ts` with `cn()` using `clsx` and `tailwind-merge`."*

**What Came Back:**
- Fully typed primitives in `src/ui/` built on `@radix-ui/react-*` components with `class-variance-authority`.
- Configured focus states with brand-colored outlines and clear contrast against light/dark mode backgrounds.
- Explicit `hasError` property on `Input` for wiring `aria-invalid` and `aria-describedby` dynamically.

---

### Prompt 3: Optimistic UI Rollback & Idempotent Retry Hook (`useSendMoney`)
**Prompt Given:**
> *"Implement `src/hooks/useSendMoney.ts` using TanStack Query v5 `useMutation`. When a transfer is submitted, `onMutate` must cancel outgoing queries for `['wallet-summary']` and `['transactions']`, snapshot both caches, deduct the transfer amount and NIP fee from available balance, and prepend an optimistic pending debit to the feed. In `onError`, restore both snapshots without requiring a page reload and trigger a destructive toast notification that includes a 'Retry Transfer' action re-submitting the exact same payload and locked Idempotency-Key. In `onSettled`, invalidate queries."*

**What Came Back:**
- A robust optimistic mutation cycle with snapshot capture and restoration.
- Destructive toast notification using the custom `use-toast` queue rendering the `Retry Transfer` button with the identical `Idempotency-Key`.
- Query cache re-validation on settlement to guarantee eventual consistency with MSW.

---

## 3. Three Critical Cases Where AI Output Was Wrong or Risky & How Caught/Fixed

### Case 1: Naive Floating-Point Kobo Math
- **The AI's Risky Output**:
  In an early draft of the currency utility, the AI generated:
  ```typescript
  // Flawed AI output:
  export function parseNairaInputToKobo(val: string): number {
    const cleaned = parseFloat(val.replace(/,/g, ''))
    return Math.round(cleaned * 100)
  }
  ```
- **The Risk**:
  JavaScript's standard `Number` is an IEEE 754 double-precision float. For numbers like `"19.99"`, `parseFloat("19.99") * 100` evaluates to `1998.9999999999998`. While `Math.round()` happens to round this specific case to `1999`, other user inputs or partial amounts (especially when performing fractional fee additions or chained currency divisions) accumulate precision drift. In banking systems, any truncation can cause discrepancy between ledger debit totals and beneficiary credits.
- **How It Was Caught**:
  During test-driven review in `src/utils/__tests__/currency.test.ts`, boundary cases testing raw float strings were examined for precision guarantees.
- **The Remediation**:
  Replaced with string-splitting and `BigInt` integer arithmetic that never converts the input to a float:
  ```typescript
  export function parseNairaInputToKobo(input: string): Kobo {
    const clean = input.replace(/[^\d.]/g, '')
    const [nairaPart, rawFraction = ''] = clean.split('.')
    const paddedFraction = rawFraction.padEnd(2, '0').slice(0, 2)
    const totalKobo = BigInt(nairaPart || '0') * 100n + BigInt(paddedFraction)
    if (totalKobo > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new RangeError('Amount exceeds maximum safe transaction limit')
    }
    return Number(totalKobo) as Kobo
  }
  ```

---

### Case 2: Idempotency Key Regeneration Inside Fetch Retry Interceptor
- **The AI's Risky Output**:
  In the initial API client draft, the AI generated a new `Idempotency-Key` dynamically inside the HTTP request helper:
  ```typescript
  // Flawed AI output:
  export async function postTransfer(payload: SendMoneyPayload) {
    return apiFetch('/api/transfers', {
      method: 'POST',
      headers: {
        'Idempotency-Key': crypto.randomUUID(), // BUG: generates new UUID on every attempt!
      },
      body: JSON.stringify(payload),
    })
  }
  ```
- **The Risk**:
  On unstable 3G networks in Nigeria, a client often experiences a TCP timeout after the banking gateway has already received and executed the debit request. When TanStack Query's automatic exponential backoff or the user retries the request, generating a **new UUID** treats the retry as a brand new transfer intent, resulting in a **duplicate debit** from the merchant's account.
- **How It Was Caught**:
  Caught while designing the MSW idempotency test in `src/__tests__/SendMoney.test.tsx` and verifying retry behavior.
- **The Remediation**:
  1. Mandated that `idempotencyKey` be part of `SendMoneyPayload` and generated **only once** when the merchant advances to the "Review" step (`handleAmountSubmit`).
  2. Locked the key in component state and passed it explicitly to `postTransfer`.
  3. Validated via Vitest assertions that when the retry button was clicked following a simulated 503 error, `capturedHeaders[1] === capturedHeaders[0]` (identical key sent to MSW for deduplication).

---

### Case 3: Incomplete Optimistic Cache Rollback & Radix JSDOM Testing Traps
- **The AI's Risky Output**:
  The AI's initial `useSendMoney` implementation merely called `queryClient.invalidateQueries()` in `onError`, omitting snapshot restoration:
  ```typescript
  // Flawed AI output:
  onError: () => {
    // Only invalidating leaves optimistic deduction active until network query completes!
    queryClient.invalidateQueries({ queryKey: ['wallet-summary'] })
  }
  ```
  Furthermore, the AI generated test files for Radix `Dialog` and `Select` components without configuring JSDOM polyfills, causing Vitest to crash with `TypeError: ResizeObserver is not a constructor` and `element.scrollIntoView is not a function`.
- **The Risk**:
  When offline, invalidating queries does nothing because the fetch fails; the merchant would see a lower balance even though the money was never sent. In the testing environment, Radix UI's modal focus trapping and `aria-hidden` attributes hid root DOM elements from `@testing-library/react` queries.
- **How It Was Caught**:
  1. Offline simulation testing revealed that balance stayed decremented when network requests failed without connectivity.
  2. Running `npx vitest run` immediately threw JSDOM runtime errors for missing browser APIs and could not find buttons that had been marked with `aria-hidden="true"` by open Radix dialogs.
- **The Remediation**:
  1. Configured complete snapshot restoration in `useSendMoney.ts`:
     ```typescript
     onError: (err, variables, context) => {
       if (context?.previousWallet) {
         queryClient.setQueryData(WALLET_QUERY_KEY, context.previousWallet)
       }
       if (context?.previousTransactions) {
         context.previousTransactions.forEach(([queryKey, data]) => {
           queryClient.setQueryData(queryKey, data)
         })
       }
       // ... trigger destructive notification
     }
     ```
  2. Added polyfills in `src/test/setup.ts` for `ResizeObserver`, `scrollIntoView`, `hasPointerCapture`, and `matchMedia`.
  3. Added `data-testid="available-balance-amount"` to `BalanceSummary.tsx` and utilized `{ hidden: true }` in test queries to assert that toasts and rollback buttons inside Radix portals function correctly even while dialogs are open.

---

## 4. Summary of Verification Status

| Suite | Scope | Target | Result |
| :--- | :--- | :--- | :--- |
| **Vitest** | Unit & Component Integration | 12 Test Files, 115 Tests | **115 Passed (100%)** |
| **Playwright** | E2E (Desktop Chrome & Mobile 360px) | Happy Path & 503 Rollback | **4 Passed (100%)** |
| **Vite & TSC** | Production Compilation | `tsc -b && vite build` | **0 Errors (`dist/`)** |
| **Storybook** | Visual Documentation Bundle | `storybook build` | **0 Errors (`storybook-static/`)** |
