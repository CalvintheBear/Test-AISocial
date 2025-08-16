import * as React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle'
  width?: string | number
  height?: string | number
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className, 
  variant = 'rect',
  width,
  height,
  style,
  ...props 
}) => {
  const baseClasses = 'animate-pulse rounded-md bg-line-muted'
  
  const variantClasses = {
    text: 'h-4 w-full',
    rect: 'h-20 w-full',
    circle: 'rounded-full',
  }
  
  const customStyle: React.CSSProperties = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
    ...style,
  }
  
  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={customStyle}
      aria-busy="true"
      aria-label="Loading..."
      {...props}
    />
  )
}

// Skeleton text utility
const SkeletonText: React.FC<Omit<SkeletonProps, 'variant'>> = ({ 
  className, 
  ...props 
}) => (
  <Skeleton variant="text" className={cn('h-4', className)} {...props} />
)

// Skeleton line utility
const SkeletonLine: React.FC<Omit<SkeletonProps, 'variant'>> = ({ 
  className, 
  ...props 
}) => (
  <Skeleton variant="text" className={cn('h-5', className)} {...props} />
)

// Skeleton rectangle utility
const SkeletonRect: React.FC<SkeletonProps> = ({ 
  className, 
  ...props 
}) => (
  <Skeleton variant="rect" className={className} {...props} />
)

// Skeleton circle utility
const SkeletonCircle: React.FC<SkeletonProps> = ({ 
  className, 
  ...props 
}) => (
  <Skeleton variant="circle" className={cn('w-12 h-12', className)} {...props} />
)

Skeleton.displayName = 'Skeleton'
SkeletonText.displayName = 'SkeletonText'
SkeletonLine.displayName = 'SkeletonLine'
SkeletonRect.displayName = 'SkeletonRect'
SkeletonCircle.displayName = 'SkeletonCircle'

export { Skeleton, SkeletonText, SkeletonLine, SkeletonRect, SkeletonCircle }