import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * When true, applies the error/invalid visual state.
   * Bind to `aria-invalid` and pair with `aria-describedby` pointing at
   * the error message element for WCAG 2.1 AA compliance.
   */
  hasError?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, hasError, 'aria-invalid': ariaInvalid, ...props }, ref) => {
    const isInvalid = hasError !== undefined ? Boolean(hasError) : ariaInvalid === true || ariaInvalid === 'true'

    return (
      <input
        type={type}
        aria-invalid={ariaInvalid ?? (hasError !== undefined ? (hasError ? 'true' : 'false') : undefined)}
        className={cn(
          'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ring-offset-white',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-gray-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Normal border
          'border-gray-300 dark:border-gray-700',
          // Dark mode
          'dark:bg-gray-900 dark:ring-offset-gray-900 dark:placeholder:text-gray-500',
          // Error state — red border + red focus ring
          isInvalid && 'border-red-500 focus-visible:ring-red-500',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
