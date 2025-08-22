"use client"

import { useState, useCallback } from 'react'
import { useDebouncedCallback, useDebounce } from '@/hooks/useDebounce'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function DebounceDemo() {
  const [inputValue, setInputValue] = useState('')
  const [clickCount, setClickCount] = useState(0)
  const [immediateCount, setImmediateCount] = useState(0)

  // 防抖输入值
  const debouncedInput = useDebounce(inputValue, 500)

  // 防抖点击处理
  const handleDebouncedClick = useDebouncedCallback(() => {
    setClickCount(prev => prev + 1)
    console.log('防抖点击执行')
  }, 1000, [])

  // 立即点击处理
  const handleImmediateClick = useCallback(() => {
    setImmediateCount(prev => prev + 1)
    console.log('立即点击执行')
  }, [])

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-2xl font-bold">防抖功能演示</h2>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">输入防抖演示</h3>
        <div className="space-y-3">
          <Input
            placeholder="输入一些文字..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <div className="space-y-2 text-sm">
            <p>实时输入: <code className="bg-gray-100 px-2 py-1 rounded">{inputValue}</code></p>
            <p>防抖后(500ms): <code className="bg-blue-100 px-2 py-1 rounded">{debouncedInput}</code></p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">点击防抖演示</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={handleDebouncedClick} variant="default">
              防抖按钮 (1秒)
            </Button>
            <Button onClick={handleImmediateClick} variant="outline">
              立即按钮
            </Button>
          </div>
          <div className="space-y-2 text-sm">
            <p>防抖点击次数: <strong>{clickCount}</strong></p>
            <p>立即点击次数: <strong>{immediateCount}</strong></p>
          </div>
          <div className="text-xs text-gray-600">
            <p>💡 尝试快速连续点击防抖按钮，观察执行次数的变化</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">防抖配置说明</h3>
        <div className="space-y-2 text-sm">
          <p>• <strong>搜索输入</strong>: 300-500ms 防抖</p>
          <p>• <strong>点赞/收藏</strong>: 300ms 防抖</p>
          <p>• <strong>隐私设置</strong>: 500ms 防抖</p>
          <p>• <strong>Tab切换</strong>: 200-300ms 防抖</p>
          <p>• <strong>数据加载</strong>: 1000ms 防抖</p>
        </div>
      </Card>
    </div>
  )
}
