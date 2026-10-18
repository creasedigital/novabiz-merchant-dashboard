import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Badge — semantic colour variants for transaction status, KYC tiers,
 * and payment channels.
 *
 * Contrast ratios are verified at ≥ 4.5:1 in both light and dark modes
 * per WCAG 2.1 AA.
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        // Transaction status variants
        successful:
          'border-transparent bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        pending:
          'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        failed:
          'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',

        // Transaction type variants
        credit:
          'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        debit:
          'border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',

        // KYC tier variants
        tier1:
          'border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        tier2:
          'border-transparent bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-300',
        tier3:
          'border-transparent bg-fbgreen-100 text-fbgreen-700 dark:bg-fbgreen-500/20 dark:text-fbgreen-500',

        // Generic
        default:
          'border-transparent bg-brand-600 text-white',
        secondary:
          'border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        outline:
          'text-gray-700 dark:text-gray-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
