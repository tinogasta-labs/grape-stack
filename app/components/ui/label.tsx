import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '~/utils/misc'

export function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn('text-fg-muted text-sm whitespace-nowrap', className)}
      {...props}
    />
  )
}
