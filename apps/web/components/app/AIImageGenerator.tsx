"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useArtworkGeneration } from '@/hooks/useArtworkGeneration'
import { AIGenerationResult } from './AIGenerationResult'
import { authFetch } from '@/lib/api/client'
import { 
  SUPPORTED_MODELS, 
  SUPPORTED_ASPECT_RATIOS, 
  SUPPORTED_OUTPUT_FORMATS,
  type SupportedModel,
  type SupportedAspectRatio,
  type SupportedOutputFormat
} from '@/lib/types/generation'

interface AIImageGeneratorProps {
  onGenerationComplete?: (artworkId: string) => void
  className?: string
}

export function AIImageGenerator({ onGenerationComplete, className }: AIImageGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState<SupportedModel>('flux-kontext-pro')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<SupportedAspectRatio>('1:1')
  const [selectedOutputFormat, setSelectedOutputFormat] = useState<SupportedOutputFormat>('png')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [generationResult, setGenerationResult] = useState<any>(null)
  
  const { 
    generating, 
    status, 
    generateImage, 
    pollStatus 
  } = useArtworkGeneration()

  // 获取当前用户ID
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await authFetch('/api/users/me')
        if (response?.id) {
          setCurrentUserId(response.id)
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
      }
    }
    getCurrentUser()
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    try {
      const artworkId = await generateImage(prompt, {
        model: selectedModel,
        aspectRatio: selectedAspectRatio,
        outputFormat: selectedOutputFormat
      })

      // 开始轮询状态
      const result = await pollStatus(artworkId)
      if (result.success) {
        // 设置生成结果
        setGenerationResult({
          id: artworkId,
          status: 'completed',
          resultImageUrl: status || '', // 使用status作为临时结果
          originalImageUrl: ''
        })
        
        if (onGenerationComplete) {
          onGenerationComplete(artworkId)
        }
      }
    } catch (error) {
      console.error('生成失败:', error)
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            🎨 AI 图像生成器
            {generating && <Badge variant="secondary">生成中...</Badge>}
          </h2>
          <p className="text-sm text-gray-600">
            使用先进的AI技术，将你的创意转化为精美图像
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* 提示词输入 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">描述你的创意</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="例如：一只可爱的小猫坐在花园里，阳光明媚，风格温馨..."
              className="w-full min-h-[100px] p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={generating}
            />
          </div>

          {/* 配置选项 */}
          <Tabs defaultValue="model" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="model">模型</TabsTrigger>
              <TabsTrigger value="aspect">宽高比</TabsTrigger>
              <TabsTrigger value="format">输出格式</TabsTrigger>
            </TabsList>

            {/* 模型选择 */}
            <TabsContent value="model" className="space-y-3">
              <div className="grid gap-3">
                {Object.entries(SUPPORTED_MODELS).map(([key, model]) => (
                  <div
                    key={key}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedModel === key 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedModel(key as SupportedModel)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{model.name}</h4>
                        <p className="text-sm text-gray-600">{model.description}</p>
                      </div>
                      <Badge variant={selectedModel === key ? "default" : "secondary"}>
                        {model.price}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* 宽高比选择 */}
            <TabsContent value="aspect" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {SUPPORTED_ASPECT_RATIOS.map((ratio) => (
                  <div
                    key={ratio.value}
                    className={`p-3 border rounded-lg cursor-pointer text-center transition-colors ${
                      selectedAspectRatio === ratio.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedAspectRatio(ratio.value)}
                  >
                    <div className={`text-2xl mb-2 p-2 rounded-lg ${
                      selectedAspectRatio === ratio.value 
                        ? 'bg-gradient-to-br from-cyan-400/20 to-blue-500/20' 
                        : 'bg-gray-100'
                    }`}>
                      <span className="opacity-80">{ratio.icon}</span>
                    </div>
                    <div className="font-medium">{ratio.label}</div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* 输出格式选择 */}
            <TabsContent value="format" className="space-y-3">
              <div className="grid gap-3">
                {SUPPORTED_OUTPUT_FORMATS.map((format) => (
                  <div
                    key={format.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedOutputFormat === format.value 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedOutputFormat(format.value)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{format.label}</h4>
                        <p className="text-sm text-gray-600">{format.description}</p>
                      </div>
                      <Badge variant={selectedOutputFormat === format.value ? "default" : "secondary"} className={selectedOutputFormat === format.value ? "shadow-sm" : "bg-secondary text-secondary-foreground shadow-sm"}>
                        {format.value.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* 状态显示 */}
          {status && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">{status}</p>
            </div>
          )}

          {/* 生成按钮 */}
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            className="w-full"
            size="lg"
          >
            {generating ? '生成中...' : '🎨 开始生成'}
          </Button>

          {/* 提示信息 */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>💡 提示：描述越详细，生成的图像越符合预期</p>
            <p>⚡ 生成时间：通常需要1-3分钟</p>
            <p>🔄 支持重新生成：如果不满意可以重新生成</p>
          </div>
        </CardContent>
      </Card>

      {/* 生成结果展示 */}
      {generationResult && (
        <AIGenerationResult
          status={generationResult}
          prompt={prompt}
          model={selectedModel}
          aspectRatio={selectedAspectRatio}
          outputFormat={selectedOutputFormat}
          userId={currentUserId}
          onRegenerate={() => {
            setGenerationResult(null)
            if (prompt.trim()) {
              handleGenerate()
            }
          }}
          className="mt-6"
        />
      )}
    </div>
  )
}
