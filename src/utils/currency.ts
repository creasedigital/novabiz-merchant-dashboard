/**
 * NovaBiz — Currency Utilities
 *
 * ## Non-Negotiable Rules (from CLAUDE.md)
 *
 * 1. ALL monetary values are integer kobo (`type Kobo = number`).
 * 2. NEVER use `parseFloat(val) * 100` — it causes floating-point drift
 *    (e.g. 19.99 * 100 === 1998.9999999999998).
 * 3. Parse user input by splitting on '.', converting integer Naira and
 *    fractional parts via BigInt arithmetic, then converting to safe number.
 * 4. Format kobo → Naira ONLY using `Intl.NumberFormat` — never regex/splice.
 */

import type { Kobo } from '@/types/domain'

// ---------------------------------------------------------------------------
// Internal assertion
// ---------------------------------------------------------------------------

/**
 * Asserts that `value` is a safe integer (i.e. a valid kobo amount).
 * Throws a `RangeError` at runtime if the invariant is violated.
 */
export function assertKobo(value: number, label = 'kobo value'): asserts value is Kobo {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `assertKobo: ${label} must be a safe integer, got ${String(value)} (${typeof value})`,
    )
  }
}

// ---------------------------------------------------------------------------
// Formatter — kobo → display string
// ---------------------------------------------------------------------------

const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Formats an integer kobo amount into a Nigerian Naira display string.
 *
 * @example
 *   formatKoboToNaira(100050) // "₦1,000.50"
 *   formatKoboToNaira(0)      // "₦0.00"
 *   formatKoboToNaira(-5000)  // "-₦50.00"
 *
 * @throws {RangeError} if `kobo` is not a safe integer
 */
export function formatKoboToNaira(kobo: number): string {
  assertKobo(kobo, 'formatKoboToNaira argument')
  // Safe: integer division by 100 — no fractional drift
  return nairaFormatter.format(kobo / 100)
}

// ---------------------------------------------------------------------------
// Parser — user Naira input string → integer kobo
// ---------------------------------------------------------------------------

/** Regex: allow digits, commas (thousands separator), and one decimal point. */
const VALID_CURRENCY_PATTERN = /^-?[\d,]+(\.\d{0,2})?$/

/**
 * Converts a user-entered Naira string into integer kobo using pure integer /
 * BigInt arithmetic — no `parseFloat * 100`.
 *
 * Accepted formats: "1,000.50", "19.99", "500", "0.01", "-250.00"
 *
 * @returns Integer kobo, or `NaN` for invalid / ambiguous input.
 *
 * @example
 *   parseNairaInputToKobo("19.99")    // 1999
 *   parseNairaInputToKobo("1,000.50") // 100050
 *   parseNairaInputToKobo("500")      // 50000
 *   parseNairaInputToKobo("0")        // 0
 *   parseNairaInputToKobo("abc")      // NaN
 *   parseNairaInputToKobo("1.999")    // NaN  (>2 decimal places)
 */
export function parseNairaInputToKobo(input: string): number {
  if (typeof input !== 'string') return NaN

  const trimmed = input.trim()
  if (trimmed === '') return NaN

  // Detect negative sign
  const isNegative = trimmed.startsWith('-')
  const absStr = isNegative ? trimmed.slice(1) : trimmed

  // Validate allowed characters (digits, commas, optional dot + up to 2 digits)
  if (!VALID_CURRENCY_PATTERN.test(absStr)) return NaN

  // Strip comma thousands-separators
  const noCommas = absStr.replace(/,/g, '')

  // Split into integer Naira part and optional fractional kobo part
  const dotIndex = noCommas.indexOf('.')
  let nairaPart: string
  let fractionStr: string

  if (dotIndex === -1) {
    // No decimal point
    nairaPart = noCommas
    fractionStr = '00'
  } else {
    nairaPart = noCommas.slice(0, dotIndex)
    const rawFraction = noCommas.slice(dotIndex + 1)

    // Reject more than 2 decimal places
    if (rawFraction.length > 2) return NaN

    // Pad to exactly 2 digits (e.g. "5" → "50")
    fractionStr = rawFraction.padEnd(2, '0')
  }

  // Guard empty naira part (e.g. input was just ".")
  // if (nairaPart === '' || nairaPart === undefined) return NaN

  // BigInt arithmetic — immune to floating-point drift
  try {
    const koboAbs = Number(BigInt(nairaPart) * 100n + BigInt(fractionStr))
    if (!Number.isSafeInteger(koboAbs)) return NaN
    return isNegative ? -koboAbs : koboAbs
  } catch {
    // BigInt() throws SyntaxError on non-integer strings
    return NaN
  }
}

// ---------------------------------------------------------------------------
// Kobo arithmetic helpers — always assert safe integer invariant
// ---------------------------------------------------------------------------

/**
 * Adds two kobo amounts.
 *
 * @throws {RangeError} if either argument is not a safe integer, or if the
 *   result overflows `Number.MAX_SAFE_INTEGER`.
 */
export function addKobo(a: number, b: number): Kobo {
  assertKobo(a, 'addKobo(a)')
  assertKobo(b, 'addKobo(b)')
  const result = a + b
  assertKobo(result, 'addKobo result')
  return result;
  // return result as Kobo
}

/**
 * Subtracts `b` from `a` in kobo.
 *
 * @throws {RangeError} if either argument is not a safe integer, or if the
 *   result underflows `-Number.MAX_SAFE_INTEGER`.
 */
export function subtractKobo(a: number, b: number): Kobo {
  assertKobo(a, 'subtractKobo(a)')
  assertKobo(b, 'subtractKobo(b)')
  const result = a - b
  assertKobo(result, 'subtractKobo result')
  return result;
  // return result as Kobo
}
