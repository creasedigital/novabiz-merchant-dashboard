import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Skeleton — animated placeholder for loading states.
 * Renders a grey pulsing block that matches the dimensions of the element
 * it replaces. Use explicitly in loading branches — never hide real content.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-800', className)}
      aria-hidden="true"
      {...props}
    />
  )
}

export { Skeleton }
