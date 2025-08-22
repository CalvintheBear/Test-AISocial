import { useCallback, useRef, useState } from 'react'

// 防抖性能指标接口
interface DebounceMetrics {
  totalCalls: number        // 总调用次数
  debouncedCalls: number    // 防抖后执行次数
  savedCalls: number        // 节省的调用次数
  averageDelay: number      // 平均延迟时间
  lastExecutionTime: number // 最后执行时间
  executionTimes: number[]  // 执行时间记录
}

// 防抖性能监控Hook
export function useDebounceMetrics() {
  const [metrics, setMetrics] = useState<Record<string, DebounceMetrics>>({})
  const callCounts = useRef<Record<string, number>>({})
  const executionTimes = useRef<Record<string, number[]>>({})

  const recordCall = useCallback((key: string) => {
    callCounts.current[key] = (callCounts.current[key] || 0) + 1
  }, [])

  const recordExecution = useCallback((key: string) => {
    const now = Date.now()
    const calls = callCounts.current[key] || 0

    if (!executionTimes.current[key]) {
      executionTimes.current[key] = []
    }
    executionTimes.current[key].push(now)

    // 保持最近50次执行记录
    if (executionTimes.current[key].length > 50) {
      executionTimes.current[key] = executionTimes.current[key].slice(-50)
    }

    setMetrics(prev => {
      const prevMetric = prev[key] || {
        totalCalls: 0,
        debouncedCalls: 0,
        savedCalls: 0,
        averageDelay: 0,
        lastExecutionTime: 0,
        executionTimes: []
      }

      const newTotalCalls = calls
      const newDebouncedCalls = prevMetric.debouncedCalls + 1
      const newSavedCalls = newTotalCalls - newDebouncedCalls

      // 计算平均延迟
      const times = executionTimes.current[key]
      let avgDelay = 0
      if (times.length > 1) {
        const delays = []
        for (let i = 1; i < times.length; i++) {
          delays.push(times[i] - times[i - 1])
        }
        avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length
      }

      return {
        ...prev,
        [key]: {
          totalCalls: newTotalCalls,
          debouncedCalls: newDebouncedCalls,
          savedCalls: newSavedCalls,
          averageDelay: avgDelay,
          lastExecutionTime: now,
          executionTimes: times
        }
      }
    })
  }, [])

  const resetMetrics = useCallback((key?: string) => {
    if (key) {
      callCounts.current[key] = 0
      executionTimes.current[key] = []
      setMetrics(prev => {
        const newMetrics = { ...prev }
        delete newMetrics[key]
        return newMetrics
      })
    } else {
      callCounts.current = {}
      executionTimes.current = {}
      setMetrics({})
    }
  }, [])

  const getMetrics = useCallback((key: string): DebounceMetrics | null => {
    return metrics[key] || null
  }, [metrics])

  const getAllMetrics = useCallback(() => metrics, [metrics])

  return {
    recordCall,
    recordExecution,
    resetMetrics,
    getMetrics,
    getAllMetrics,
    metrics
  }
}

// 带性能监控的防抖Hook
export function useDebouncedCallbackWithMetrics<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  key: string,
  deps: any[] = []
) {
  const { recordCall, recordExecution } = useDebounceMetrics()

  const debouncedCallback = useCallback((...args: any[]) => {
    recordCall(key)

    const timeoutId = setTimeout(() => {
      recordExecution(key)
      callback(...args)
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [callback, delay, key, recordCall, recordExecution, ...deps]) as T

  return debouncedCallback
}
