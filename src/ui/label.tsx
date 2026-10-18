import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
)

/**
 * Label primitive — wraps Radix Label for proper `htmlFor` wiring.
 *
 * Usage with error binding:
 * ```tsx
 * <Label htmlFor="amount" aria-describedby={error ? 'amount-error' : undefined}>
 *   Amount
 * </Label>
 * <Input id="amount" aria-invalid={!!error} aria-describedby="amount-error" />
 * {error && <p id="amount-error" role="alert">{error.message}</p>}
 * ```
 */
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), 'text-gray-700 dark:text-gray-300', className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
