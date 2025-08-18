export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()

  static trackAPIResponse(endpoint: string, duration: number) {
    console.log(`${endpoint}: ${duration}ms`)
    
    if (!this.metrics.has(endpoint)) {
      this.metrics.set(endpoint, [])
    }
    
    const times = this.metrics.get(endpoint)!
    times.push(duration)
    
    // 只保留最近100次的记录
    if (times.length > 100) {
      times.shift()
    }
  }

  static trackCacheHitRate(hit: boolean, cacheKey: string) {
    console.log(`Cache ${hit ? 'HIT' : 'MISS'}: ${cacheKey}`)
  }

  static getAverageResponseTime(endpoint: string): number {
    const times = this.metrics.get(endpoint) || []
    if (times.length === 0) return 0
    
    return times.reduce((sum, time) => sum + time, 0) / times.length
  }

  static getMetrics() {
    const result: Record<string, { count: number; average: number; max: number; min: number }> = {}
    
    this.metrics.forEach((times, endpoint) => {
      if (times.length > 0) {
        result[endpoint] = {
          count: times.length,
          average: this.getAverageResponseTime(endpoint),
          max: Math.max(...times),
          min: Math.min(...times)
        }
      }
    })
    
    return result
  }

  static clearMetrics() {
    this.metrics.clear()
  }
}