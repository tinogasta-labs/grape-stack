import { cn } from '~/utils/misc'

export function TextArea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'border-outline/50 min-h-[140px] w-full rounded-lg border px-3 py-4',
        'focus-visible:ring-primary focus-visible:ring-offset-canvas focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  )
}
