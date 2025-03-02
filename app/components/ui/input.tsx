import { cn } from '~/utils/misc'

export function Input({
  type,
  className,
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'border-outline/50 bg-panel/30 w-full rounded-lg border px-3 py-4 outline-none',
        'focus-visible:ring-offset-canvas focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2',
        'aria-invalid:border-error/50',
        className,
      )}
      {...props}
    />
  )
}
