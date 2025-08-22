import { useEffect, useState, useCallback, useRef } from 'react'

// 防抖Hook - 对值进行防抖
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// 防抖函数Hook - 对函数调用进行防抖
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: any[] = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout>()
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debouncedCallback = useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }, [delay]) as T

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, deps)

  return debouncedCallback
}

// 节流Hook - 限制函数调用频率
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: any[] = []
): T {
  const lastExecRef = useRef<number>(0)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const throttledCallback = useCallback((...args: any[]) => {
    const now = Date.now()
    if (now - lastExecRef.current >= delay) {
      lastExecRef.current = now
      callbackRef.current(...args)
    }
  }, [delay]) as T

  return throttledCallback
}

// 防抖搜索Hook - 专门用于搜索输入
export function useDebouncedSearch(
  onSearch: (query: string) => void,
  delay: number = 300
) {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, delay)

  useEffect(() => {
    if (debouncedQuery.trim()) {
      onSearch(debouncedQuery.trim())
    }
  }, [debouncedQuery, onSearch])

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery
  }
}

// 防抖状态管理Hook - 用于复杂的状态更新
export function useDebouncedState<T>(
  initialValue: T,
  onStateChange?: (value: T) => void,
  delay: number = 300
) {
  const [value, setValue] = useState(initialValue)
  const debouncedValue = useDebounce(value, delay)

  useEffect(() => {
    if (onStateChange && debouncedValue !== initialValue) {
      onStateChange(debouncedValue)
    }
  }, [debouncedValue, onStateChange, initialValue])

  return [value, setValue, debouncedValue] as const
}
