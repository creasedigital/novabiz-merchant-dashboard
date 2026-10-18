import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines clsx and tailwind-merge so Tailwind class conflicts are resolved
 * correctly (last rule wins), and conditional/array class lists are flattened.
 *
 * @example
 *   cn('px-4 py-2', isActive && 'bg-brand-600', 'px-2')
 *   // → 'py-2 bg-brand-600 px-2'  (px-4 overridden by px-2)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
