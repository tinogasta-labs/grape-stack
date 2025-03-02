import { type VariantProps, cva } from 'class-variance-authority'
import { cn } from '~/utils/misc'

const button = cva(
  [
    'w-full px-4 h-[58px] whitespace-nowrap text-sm ring-offset-canvas cursor-pointer rounded-lg text-on-primary uppercase outline-none',
    'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas focus-visible:ring-primary',
    'disabled:bg-primary-variant disabled:cursor-default',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary',
        outline: 'bg-transparent border-2 border-outline/80 text-fg',
      },
      disabled: {
        false: null,
        true: 'opacity-95 cursor-default',
      },
    },
    compoundVariants: [
      {
        variant: 'primary',
        disabled: false,
        class: 'hover:bg-primary-variant',
      },
      {
        variant: 'outline',
        disabled: false,
        class: 'hover:border-outline/100',
      },
    ],
    defaultVariants: {
      disabled: false,
      variant: 'primary',
    },
  },
)

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'>,
    VariantProps<typeof button> {}

export function Button({
  className,
  variant,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || undefined}
      className={cn(button({ variant, disabled, className }))}
      {...props}
    />
  )
}
