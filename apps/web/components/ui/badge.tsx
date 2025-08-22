import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow',
        outline: 'border-border bg-background text-foreground',
        success:
          'border-transparent bg-green-500 text-white shadow hover:bg-green-600',
        warning:
          'border-transparent bg-yellow-500 text-white shadow hover:bg-yellow-600',
        info:
          'border-transparent bg-blue-500 text-white shadow hover:bg-blue-600',
        purple:
          'border-transparent bg-purple-500 text-white shadow hover:bg-purple-600',
        pink:
          'border-transparent bg-pink-500 text-white shadow hover:bg-pink-600',
        indigo:
          'border-transparent bg-indigo-500 text-white shadow hover:bg-indigo-600',
        orange:
          'border-transparent bg-orange-500 text-white shadow hover:bg-orange-600',
        gradient:
          'border-transparent bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof badgeVariants>) {
  return (
    <div
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export type BadgeProps = React.ComponentProps<'div'> & VariantProps<typeof badgeVariants>

export { Badge, badgeVariants }