'use client'

import { ReactNode, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)

  useEffect(() => {
    if (displayChildren !== children) {
      setIsTransitioning(true)
      
      const timer = setTimeout(() => {
        setDisplayChildren(children)
        setIsTransitioning(false)
      }, 150)

      return () => clearTimeout(timer)
    }
  }, [children, displayChildren])

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        isTransitioning
          ? 'opacity-0 transform translate-y-4'
          : 'opacity-100 transform translate-y-0'
      } ${className || ''}`}
    >
      {displayChildren}
    </div>
  )
}

// 页面加载动画组件
interface PageLoaderProps {
  children: ReactNode
  className?: string
}

export function PageLoader({ children, className }: PageLoaderProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`transition-all duration-500 ease-out ${
        isLoaded
          ? 'opacity-100 transform translate-y-0'
          : 'opacity-0 transform translate-y-8'
      } ${className || ''}`}
    >
      {children}
    </div>
  )
}

// 内容渐显动画组件
interface ContentRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  duration?: number
}

export function ContentReveal({ 
  children, 
  className, 
  delay = 0, 
  duration = 600 
}: ContentRevealProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, delay)

    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      className={`transition-all duration-${duration} ease-out ${
        isVisible
          ? 'opacity-100 transform translate-y-0'
          : 'opacity-0 transform translate-y-4'
      } ${className || ''}`}
    >
      {children}
    </div>
  )
}
