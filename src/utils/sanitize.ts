/**
 * NovaBiz — Input Sanitization Utilities
 *
 * Treats all transaction narrations, merchant notes, and recipient names as
 * untrusted input (CLAUDE.md §4 Security). Never use `dangerouslySetInnerHTML`.
 *
 * These utilities are used in Zod schema `.transform()` pipelines and anywhere
 * user-controlled strings enter the application state.
 */

// ---------------------------------------------------------------------------
// HTML tag stripping
// ---------------------------------------------------------------------------

/**
 * Strips all HTML/XML tags from a string.
 * Prevents XSS if the string were ever accidentally rendered as HTML.
 *
 * @example
 *   stripHtmlTags('<script>alert(1)</script>Hello') // 'Hello'
 *   stripHtmlTags('<b>Bold</b> text')               // 'Bold text'
 */
export function stripHtmlTags(input: string): string {
  // Matches both well-formed and malformed tags, including self-closing.
  // Does NOT use innerHTML/DOMParser — pure string manipulation.
  return input.replace(/<[^>]*>/g, '')
}

// ---------------------------------------------------------------------------
// Control character stripping
// ---------------------------------------------------------------------------

/**
 * Strips ASCII/Unicode control characters that could disrupt text rendering
 * or terminal output (U+0000–U+001F, U+007F–U+009F), excluding safe whitespace
 * (0x09 tab, 0x0A LF, 0x0D CR).
 *
 * @example
 *   stripControlChars('Hello\x00World')        // 'HelloWorld'
 *   stripControlChars('Normal\nLine Break')    // 'Normal\nLine Break'
 *   stripControlChars('\x1B[31mRed\x1B[0m')   // 'Red'  (ANSI escape stripped)
 */
export function stripControlChars(input: string): string {
  // U+0000–U+001F except tab (U+0009), LF (U+000A), CR (U+000D)
  // U+007F–U+009F (C1 control characters)
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/gu, '')
}

// ---------------------------------------------------------------------------
// Null byte removal
// ---------------------------------------------------------------------------

/**
 * Removes null bytes (U+0000), which can cause issues in some DB drivers
 * and are never valid in user-facing strings.
 */
export function stripNullBytes(input: string): string {
  return input.replace(/\0/g, '')
}

// ---------------------------------------------------------------------------
// Composite sanitizer — use for narrations, merchant notes, recipient names
// ---------------------------------------------------------------------------

const MAX_NARRATION_LENGTH = 100

/**
 * Sanitises an untrusted narration / transaction description string by:
 * 1. Stripping HTML tags (XSS prevention).
 * 2. Stripping control characters (rendering safety).
 * 3. Normalising Unicode to NFC form.
 * 4. Trimming leading/trailing whitespace.
 * 5. Collapsing multiple consecutive spaces into one.
 * 6. Truncating to `maxLength` characters (default: 100).
 *
 * @param input   Raw untrusted string.
 * @param maxLength  Maximum output length (default: 100 chars).
 * @returns Sanitised string safe for display and storage.
 *
 * @example
 *   sanitizeNarration('<b>Transfer</b> for\x00 goods\x1B[31m')
 *   // → 'Transfer for goods'
 */
export function sanitizeNarration(
  input: string,
  maxLength: number = MAX_NARRATION_LENGTH,
): string {
  if (typeof input !== 'string') return ''

  return stripHtmlTags(input)
    .normalize('NFC')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/gu, '') // control chars
    .replace(/\0/g, '') // null bytes
    .trim()
    .replace(/[ \t]+/g, ' ') // collapse whitespace runs
    .slice(0, maxLength)
}

/**
 * Sanitises a recipient / counterparty display name.
 * Applies the same pipeline as `sanitizeNarration` but with a shorter cap.
 */
export function sanitizeDisplayName(input: string): string {
  return sanitizeNarration(input, 100)
}
