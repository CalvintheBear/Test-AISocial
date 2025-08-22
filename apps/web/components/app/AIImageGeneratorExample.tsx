"use client"

import { useState } from 'react'
import { AIImageGenerator } from './AIImageGenerator'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function AIImageGeneratorExample() {
  const [showGenerator, setShowGenerator] = useState(false)
  const [generatedArtworks, setGeneratedArtworks] = useState<string[]>([])

  const handleGenerationComplete = (artworkId: string) => {
    setGeneratedArtworks(prev => [...prev, artworkId])
    // 这里可以刷新作品列表或跳转到作品详情页
    console.log('生成完成，作品ID:', artworkId)
  }

  return (
    <div className="space-y-6">
      {/* 控制按钮 */}
      <div className="flex gap-4">
                 <Button
           onClick={() => setShowGenerator(!showGenerator)}
           variant={showGenerator ? "outline" : "default"}
         >
          {showGenerator ? '隐藏生成器' : '🎨 创建AI图像'}
        </Button>
        
                 {generatedArtworks.length > 0 && (
           <Button variant="outline" onClick={() => setGeneratedArtworks([])}>
             清空记录 ({generatedArtworks.length})
           </Button>
         )}
      </div>

      {/* AI图像生成器 */}
      {showGenerator && (
        <AIImageGenerator
          onGenerationComplete={handleGenerationComplete}
          className="max-w-2xl"
        />
      )}

      {/* 生成记录 */}
      {generatedArtworks.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">最近生成的图像</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {generatedArtworks.map((artworkId, index) => (
                <div key={artworkId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">#{index + 1}</span>
                    <span className="font-mono text-sm">{artworkId}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`/artwork/${artworkId}`, '_blank')}
                  >
                    查看作品
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">💡 使用说明</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">🎯 模型选择</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Pro模型</strong>: 标准场景，性价比高</li>
                <li>• <strong>Max模型</strong>: 复杂场景，质量更高</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">📐 宽高比</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>1:1</strong>: 正方形，适合头像</li>
                <li>• <strong>16:9</strong>: 横屏，适合壁纸</li>
                <li>• <strong>9:16</strong>: 竖屏，适合手机</li>
              </ul>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">🖼️ 输出格式</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>PNG</strong>: 无损压缩，质量更好（默认）</li>
              <li>• <strong>JPEG</strong>: 有损压缩，文件较小</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
