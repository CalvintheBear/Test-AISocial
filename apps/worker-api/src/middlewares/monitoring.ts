interface MetricsData {
  endpoint: string
  method: string
  status: number
  duration: number
  timestamp: number
  userId?: string
  error?: string
}

export class MetricsCollector {
  private static instance: MetricsCollector
  private metrics: MetricsData[] = []
  
  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector()
    }
    return MetricsCollector.instance
  }

  recordMetric(data: MetricsData) {
    this.metrics.push(data)
    
    // 只保留最近1000条
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  getMetrics(timeRange: number = 3600000) { // 默认1小时
    const cutoff = Date.now() - timeRange
    return this.metrics.filter(m => m.timestamp > cutoff)
  }

  getErrorRate(timeRange: number = 3600000) {
    const recent = this.getMetrics(timeRange)
    if (recent.length === 0) return 0
    
    const errors = recent.filter(m => m.status >= 400).length
    return errors / recent.length
  }

  getAverageResponseTime(timeRange: number = 3600000) {
    const recent = this.getMetrics(timeRange)
    if (recent.length === 0) return 0
    
    return recent.reduce((sum, m) => sum + m.duration, 0) / recent.length
  }

  getCacheHitRate(timeRange: number = 3600000) {
    // 这个需要通过缓存中间件来统计
    // 这里返回模拟数据
    return 0.85 // 85% 命中率
  }
}

export const metricsCollector = MetricsCollector.getInstance()

// 告警配置
interface AlertConfig {
  errorRateThreshold: number
  responseTimeThreshold: number
  cacheHitRateThreshold: number
}

const defaultAlertConfig: AlertConfig = {
  errorRateThreshold: 0.01, // 1%
  responseTimeThreshold: 2000, // 2秒
  cacheHitRateThreshold: 0.8 // 80%
}

export class AlertManager {
  private config: AlertConfig
  
  constructor(config: AlertConfig = defaultAlertConfig) {
    this.config = config
  }

  checkAlerts() {
    const errorRate = metricsCollector.getErrorRate()
    const avgResponseTime = metricsCollector.getAverageResponseTime()
    const cacheHitRate = metricsCollector.getCacheHitRate()

    const alerts = []

    if (errorRate > this.config.errorRateThreshold) {
      alerts.push({
        type: 'ERROR_RATE_HIGH',
        message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold`,
        severity: 'high'
      })
    }

    if (avgResponseTime > this.config.responseTimeThreshold) {
      alerts.push({
        type: 'RESPONSE_TIME_HIGH',
        message: `Average response time ${avgResponseTime.toFixed(0)}ms exceeds threshold`,
        severity: 'medium'
      })
    }

    if (cacheHitRate < this.config.cacheHitRateThreshold) {
      alerts.push({
        type: 'CACHE_HIT_RATE_LOW',
        message: `Cache hit rate ${(cacheHitRate * 100).toFixed(2)}% below threshold`,
        severity: 'medium'
      })
    }

    return alerts
  }

  async sendAlerts(alerts: any[]) {
    for (const alert of alerts) {
      console.error(`[ALERT] ${alert.type}: ${alert.message}`)
      
      // 这里可以集成外部告警系统，如：
      // - 发送邮件
      // - 发送Slack消息
      // - 写入日志系统
      
      try {
        // 示例：发送到外部监控系统
        await fetch('https://your-monitoring-service.com/alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...alert,
            service: 'ai-social-api',
            timestamp: Date.now()
          })
        })
      } catch (error) {
        console.error('Failed to send alert:', error)
      }
    }
  }
}

export const alertManager = new AlertManager()

// 中间件
export async function monitoringMiddleware(c: any, next: any) {
  const start = Date.now()
  const userId = c.get('userId')
  
  try {
    await next()
    
    const duration = Date.now() - start
    
    metricsCollector.recordMetric({
      endpoint: c.req.path,
      method: c.req.method,
      status: c.res.status || 200,
      duration,
      timestamp: Date.now(),
      userId
    })
    
  } catch (error) {
    const duration = Date.now() - start
    
    metricsCollector.recordMetric({
      endpoint: c.req.path,
      method: c.req.method,
      status: 500,
      duration,
      timestamp: Date.now(),
      userId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    throw error
  }
}

// 健康检查端点
export function setupHealthChecks(app: any) {
  app.get('/api/health/metrics', async (c: any) => {
    const metrics = {
      errorRate: metricsCollector.getErrorRate(),
      avgResponseTime: metricsCollector.getAverageResponseTime(),
      cacheHitRate: metricsCollector.getCacheHitRate(),
      totalRequests: metricsCollector.getMetrics().length
    }
    
    return c.json(metrics)
  })

  app.get('/api/health/alerts', async (c: any) => {
    const alerts = alertManager.checkAlerts()
    
    if (alerts.length > 0) {
      await alertManager.sendAlerts(alerts)
    }
    
    return c.json({ alerts, timestamp: Date.now() })
  })
}