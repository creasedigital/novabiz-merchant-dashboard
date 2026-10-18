/**
 * Toaster — accessible live-region notification renderer.
 *
 * Mount once inside your root layout. Toasts are announced by screen readers
 * via aria-live="polite" and role="status". For urgent errors (destructive
 * variant), aria-live="assertive" is used instead.
 */
import { useToast, type ToastVariant } from './use-toast'
import { cn } from '@/lib/utils'

const variantStyles: Record<ToastVariant, string> = {
  default:
    'bg-white border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-50',
  success:
    'bg-green-50 border-green-500 text-green-900 dark:bg-green-950/30 dark:border-green-500/50 dark:text-green-100',
  destructive:
    'bg-red-50 border-red-500 text-red-900 dark:bg-red-950/30 dark:border-red-500/50 dark:text-red-100',
  warning:
    'bg-amber-50 border-amber-500 text-amber-900 dark:bg-amber-950/30 dark:border-amber-500/50 dark:text-amber-100',
  info:
    'bg-brand-50 border-brand-500 text-brand-900 dark:bg-brand-950/30 dark:border-brand-500/50 dark:text-brand-100',
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    // Fixed container — stacks toasts at bottom-right, adjusts for mobile
    <div
      className="fixed bottom-4 right-4 z-[100] flex max-h-screen w-full max-w-sm flex-col-reverse gap-2 xs:bottom-4 xs:right-4"
      aria-label="Notifications"
    >
      {toasts
        .filter((t) => t.open)
        .map((t) => {
          const variant = t.variant ?? 'default'
          const isDestructive = variant === 'destructive'
          return (
            <div
              key={t.id}
              role={isDestructive ? 'alert' : 'status'}
              aria-live={isDestructive ? 'assertive' : 'polite'}
              aria-atomic="true"
              className={cn(
                'pointer-events-auto flex w-full items-start gap-3 rounded-lg border p-4 shadow-lg',
                'transition-all duration-300',
                t.open ? 'animate-in slide-in-from-right-full' : 'animate-out slide-out-to-right-full opacity-0',
                variantStyles[variant],
              )}
            >
              <div className="flex-1 space-y-1">
                {t.title && (
                  <p className="text-sm font-semibold leading-none">{t.title}</p>
                )}
                {t.description && (
                  <p className="text-sm opacity-90">{t.description}</p>
                )}
              </div>
              {t.action}
              <button
                onClick={() => t.onOpenChange(false)}
                className={cn(
                  'ml-auto shrink-0 rounded-sm opacity-70 ring-offset-white transition-opacity',
                  'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                  'dark:ring-offset-gray-900',
                )}
                aria-label="Dismiss notification"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )
        })}
    </div>
  )
}
