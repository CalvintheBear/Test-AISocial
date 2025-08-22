'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedContainerProps {
  children: ReactNode
  className?: string
  animation?: 'fade-in' | 'fade-in-up' | 'fade-in-down' | 'fade-in-left' | 'fade-in-right'
  delay?: number
  duration?: number
  threshold?: number
  trigger?: 'onMount' | 'onScroll' | 'onHover'
  once?: boolean
}

export function AnimatedContainer({
  children,
  className,
  animation = 'fade-in-up',
  delay = 0,
  duration = 600,
  threshold = 0.1,
  trigger = 'onMount',
  once = true
}: AnimatedContainerProps) {
  const [isVisible, setIsVisible] = useState(trigger === 'onMount')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (trigger === 'onMount') {
      const timer = setTimeout(() => setIsVisible(true), delay)
      return () => clearTimeout(timer)
    }
  }, [trigger, delay])

  useEffect(() => {
    if (trigger !== 'onScroll') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [trigger, threshold, once])

  const handleMouseEnter = () => {
    if (trigger === 'onHover') {
      setIsVisible(true)
    }
  }

  const handleMouseLeave = () => {
    if (trigger === 'onHover' && !once) {
      setIsVisible(false)
    }
  }

  const animationClasses = {
    'fade-in': 'animate-fade-in',
    'fade-in-up': 'animate-fade-in-up',
    'fade-in-down': 'animate-fade-in-down',
    'fade-in-left': 'animate-fade-in-left',
    'fade-in-right': 'animate-fade-in-right'
  }

  // 生成延迟和持续时间的CSS类
  const getDelayClass = (delay: number) => {
    if (delay <= 0) return ''
    if (delay <= 100) return 'animate-delay-100'
    if (delay <= 200) return 'animate-delay-200'
    if (delay <= 300) return 'animate-delay-300'
    if (delay <= 400) return 'animate-delay-400'
    if (delay <= 500) return 'animate-delay-500'
    if (delay <= 600) return 'animate-delay-600'
    if (delay <= 700) return 'animate-delay-700'
    if (delay <= 800) return 'animate-delay-800'
    return 'animate-delay-800'
  }

  const getDurationClass = (duration: number) => {
    if (duration <= 300) return 'animate-duration-300'
    if (duration <= 500) return 'animate-duration-500'
    if (duration <= 700) return 'animate-duration-700'
    if (duration <= 1000) return 'animate-duration-1000'
    return 'animate-duration-1000'
  }

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-300',
        !isVisible && 'opacity-0',
        isVisible && animationClasses[animation],
        getDelayClass(delay),
        getDurationClass(duration),
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  )
}

// 便捷的动画组件
export function FadeIn({ children, ...props }: Omit<AnimatedContainerProps, 'animation'>) {
  return <AnimatedContainer animation="fade-in" {...props}>{children}</AnimatedContainer>
}

export function FadeInUp({ children, ...props }: Omit<AnimatedContainerProps, 'animation'>) {
  return <AnimatedContainer animation="fade-in-up" {...props}>{children}</AnimatedContainer>
}

export function FadeInDown({ children, ...props }: Omit<AnimatedContainerProps, 'animation'>) {
  return <AnimatedContainer animation="fade-in-down" {...props}>{children}</AnimatedContainer>
}

export function FadeInLeft({ children, ...props }: Omit<AnimatedContainerProps, 'animation'>) {
  return <AnimatedContainer animation="fade-in-left" {...props}>{children}</AnimatedContainer>
}

export function FadeInRight({ children, ...props }: Omit<AnimatedContainerProps, 'animation'>) {
  return <AnimatedContainer animation="fade-in-right" {...props}>{children}</AnimatedContainer>
}

// 列表动画组件
interface AnimatedListProps {
  children: ReactNode[]
  className?: string
  animation?: 'fade-in' | 'fade-in-up' | 'fade-in-down' | 'fade-in-left' | 'fade-in-right'
  staggerDelay?: number
  delay?: number
  duration?: number
}

export function AnimatedList({
  children,
  className,
  animation = 'fade-in-up',
  staggerDelay = 100,
  delay = 0,
  duration = 600
}: AnimatedListProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <AnimatedContainer
          key={index}
          animation={animation}
          delay={delay + index * staggerDelay}
          duration={duration}
          trigger="onScroll"
        >
          {child}
        </AnimatedContainer>
      ))}
    </div>
  )
}
