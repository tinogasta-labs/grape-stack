import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { cn } from '~/utils/misc'

type CheckboxProps = Omit<
  React.ComponentProps<typeof CheckboxPrimitive.Root>,
  'type'
> & { type?: string }

export function Checkbox({ type, className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      type="button"
      className={cn(
        'peer border-outline/50 hover:border-outline/100 focus-visible:ring-primary data-[state=checked]:bg-accent data-[state=checked]:text-on-accent h-4 w-4 shrink-0 rounded-sm border outline-none focus-visible:ring-2 disabled:cursor-default disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        className={cn('flex items-center justify-center text-current')}
      >
        <svg viewBox="0 0 8 8">
          <title>Check icon</title>
          <path
            d="M1,4 L3,6 L7,2"
            stroke="currentcolor"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
