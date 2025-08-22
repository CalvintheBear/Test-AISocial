import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface CTAButtonProps {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

const CTAButton = React.forwardRef<HTMLButtonElement, CTAButtonProps>(
  ({ children, href, onClick, className, size = 'md', variant = 'primary', disabled = false, ...props }, ref) => {
    const baseClasses = cn(
      'group inline-flex items-center justify-center gap-2 rounded-full font-semibold',
      'transition-all duration-300 ease-in-out transform',
      'border border-transparent',
      'relative overflow-hidden',
      {
        // Disabled state
        'opacity-50 cursor-not-allowed pointer-events-none': disabled,
        // Active state
        'hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl': !disabled,
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent': !disabled,
        'before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700': !disabled,
        
        // Size variants - 统一使用较大的尺寸
        'px-5 py-2.5 text-sm min-w-[120px] h-10': size === 'sm',
        'px-7 py-3.5 text-base min-w-[140px] h-12': size === 'md', 
        'px-9 py-4 text-lg min-w-[160px] h-14': size === 'lg',
        
        // Color variants - 使用渐变背景和更好的对比度
        'bg-gradient-to-r from-sky-500 to-emerald-500 text-white hover:from-sky-600 hover:to-emerald-600 shadow-sky-500/25': variant === 'primary',
        'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 shadow-gray-500/25': variant === 'secondary',
      },
      className
    )

    const iconSize = {
      sm: 'h-4 w-4',
      md: 'h-5 w-5', 
      lg: 'h-5 w-5'
    }[size]

    const content = (
      <>
        <span className="relative z-10">{children}</span>
        <ArrowRight className={`${iconSize} relative z-10 transition-transform group-hover:translate-x-1`} />
      </>
    )

    if (href && !disabled) {
      return (
        <Link href={href} className={baseClasses}>
          {content}
        </Link>
      )
    }

    return (
      <button
        ref={ref}
        className={baseClasses}
        onClick={onClick}
        disabled={disabled}
        {...props}
      >
        {content}
      </button>
    )
  }
)

CTAButton.displayName = 'CTAButton'

export { CTAButton }
