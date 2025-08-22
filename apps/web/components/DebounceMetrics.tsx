"use client"

import { useEffect } from 'react'
import { useDebounceMetrics } from '@/hooks/useDebounceMetrics'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface MetricsDisplayProps {
  metrics: {
    totalCalls: number
    debouncedCalls: number
    savedCalls: number
    averageDelay: number
    lastExecutionTime: number
  }
  title: string
}

function MetricsDisplay({ metrics, title }: MetricsDisplayProps) {
  const efficiency = metrics.totalCalls > 0
    ? ((metrics.savedCalls / metrics.totalCalls) * 100).toFixed(1)
    : '0.0'

  return (
    <Card className="p-4">
      <h4 className="font-semibold mb-3">{title}</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">总调用次数</p>
          <p className="text-lg font-bold text-blue-600">{metrics.totalCalls}</p>
        </div>
        <div>
          <p className="text-gray-600">实际执行次数</p>
          <p className="text-lg font-bold text-green-600">{metrics.debouncedCalls}</p>
        </div>
        <div>
          <p className="text-gray-600">节省调用次数</p>
          <p className="text-lg font-bold text-purple-600">{metrics.savedCalls}</p>
        </div>
        <div>
          <p className="text-gray-600">效率提升</p>
          <p className="text-lg font-bold text-orange-600">{efficiency}%</p>
        </div>
      </div>
      {metrics.averageDelay > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500">
            平均延迟: {Math.round(metrics.averageDelay)}ms
          </p>
          {metrics.lastExecutionTime > 0 && (
            <p className="text-xs text-gray-500">
              最后执行: {new Date(metrics.lastExecutionTime).toLocaleTimeString()}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

export function DebounceMetrics() {
  const { getAllMetrics, resetMetrics } = useDebounceMetrics()

  const metrics = getAllMetrics()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">防抖性能监控</h3>
        <Button
          onClick={() => resetMetrics()}
          variant="outline"
          size="sm"
        >
          重置所有指标
        </Button>
      </div>

      {Object.keys(metrics).length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-500">暂无防抖指标数据</p>
          <p className="text-xs text-gray-400 mt-1">
            使用防抖功能后，指标数据将自动显示
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(metrics).map(([key, metric]) => (
            <MetricsDisplay
              key={key}
              title={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              metrics={metric}
            />
          ))}
        </div>
      )}

      <Card className="p-4 bg-gray-50">
        <h4 className="font-semibold mb-2">📊 监控说明</h4>
        <ul className="text-sm space-y-1 text-gray-600">
          <li>• <strong>总调用次数</strong>: 用户触发操作的总次数</li>
          <li>• <strong>实际执行次数</strong>: 防抖后实际执行的次数</li>
          <li>• <strong>节省调用次数</strong>: 通过防抖节省的调用次数</li>
          <li>• <strong>效率提升</strong>: 节省调用占总调用的百分比</li>
          <li>• <strong>平均延迟</strong>: 防抖执行的平均延迟时间</li>
        </ul>
      </Card>
    </div>
  )
}
