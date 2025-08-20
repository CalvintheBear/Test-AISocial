'use client'

import { useState, useEffect, useRef } from 'react'
import { Button, Card } from '@/components/ui'
import { Sparkles, Loader2, Wand2, Upload, X } from 'lucide-react'
import { usePostPublishRedirect } from '@/hooks/usePostPublishRedirect'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import { useUserArtworks } from '@/hooks/useUserArtworks'
import { useArtworkGeneration } from '@/hooks/useArtworkGeneration'
import { AIGenerationResult } from './AIGenerationResult'

interface CreateArtworkPanelProps {
  className?: string
}

export function CreateArtworkPanel({ className }: CreateArtworkPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [inputImage, setInputImage] = useState<File | null>(null)
  const [inputImageUrl, setInputImageUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [model, setModel] = useState<'flux-kontext-pro' | 'flux-kontext-max'>('flux-kontext-pro')
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [generationResult, setGenerationResult] = useState<any>(null)
  const [isUploading, setIsUploading] = useState(false)

  const { generating, status: generationStatus, generateImage, pollStatus, regenerateImage } = useArtworkGeneration()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    if (f) {
      setInputImage(f)
      setInputImageUrl(URL.createObjectURL(f))
    }
  }

  const removeInputImage = () => {
    setInputImage(null)
    if (inputImageUrl) {
      URL.revokeObjectURL(inputImageUrl)
      setInputImageUrl(null)
    }
  }

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { optimisticAddDraft } = useUserArtworks(currentUserId || '')

  useEffect(() => {
    ;(async () => {
      try {
        const me = await authFetch(API.me)
        setCurrentUserId(me?.id || null)
      } catch {
        setCurrentUserId(null)
      }
    })()
  }, [])

  const uploadInputImage = async (): Promise<string | null> => {
    if (!inputImage) return null

    try {
      setIsUploading(true)
      const form = new FormData()
      form.append('file', inputImage)
      form.append('title', 'input_image_' + Date.now())
      
      const payload = await authFetch('/api/artworks/upload', {
        method: 'POST',
        body: form,
      })

      if (payload?.originalUrl) {
        return String(payload.originalUrl)
      }
      return null
    } catch (error) {
      console.error('上传输入图片失败:', error)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      alert('请输入生成提示词')
      return
    }

    try {
      let uploadedImageUrl: string | null = null
      
      // 如果有输入图片，先上传到R2
      if (inputImage) {
        uploadedImageUrl = await uploadInputImage()
        if (!uploadedImageUrl) {
          alert('上传输入图片失败，请重试')
          return
        }
      }

      const id = await generateImage(prompt, {
        aspectRatio,
        model,
        inputImage: uploadedImageUrl || undefined
      })
      setGenerationId(id)
      
      // 开始轮询状态
      const pollResult = await pollStatus(id)
      if (pollResult.success) {
        // 设置生成结果
        setGenerationResult({
          id: id,
          status: 'completed',
          resultImageUrl: pollResult.resultImageUrl || '',
          originalImageUrl: pollResult.originalImageUrl || '',
          inputImageUrl: uploadedImageUrl
        })
        // 设置默认标题
        if (!title.trim()) {
          setTitle(prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''))
        }
      }
    } catch (err) {
      alert('生成失败：' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  const resetPanel = () => {
    setPrompt('')
    removeInputImage()
    setTitle('')
    setGenerationResult(null)
    setGenerationId(null)
  }

  return (
    <Card className={`bg-white rounded-lg shadow-xl w-full ${className || ''}`}>
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">AI 图像生成</h2>
        <p className="text-sm text-gray-600 mt-1">使用AI生成全新图像或基于现有图片进行创作</p>
      </div>
      
      <div className="p-6">
        <div className="space-y-6">
          {/* 输入图片上传 - 可选 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              输入图片（可选）
              <span className="text-xs text-gray-500 ml-2">用于图生图模式</span>
            </label>
            {!inputImageUrl ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600 mb-2">选择一张图片作为AI生成的参考</p>
                <p className="text-xs text-gray-500 mb-3">支持JPG、PNG格式，最大10MB</p>
                <label className="block">
                  <span className="sr-only">选择输入图片</span>
                  <input 
                    aria-label="选择输入图片" 
                    title="选择输入图片" 
                    type="file" 
                    accept="image/*" 
                    onChange={onFileChange} 
                    className="block mx-auto" 
                  />
                </label>
              </div>
            ) : (
              <div className="relative">
                <img 
                  src={inputImageUrl} 
                  alt="输入图片" 
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg" 
                />
                <button
                  onClick={removeInputImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  title="移除图片"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* AI生成提示词 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {inputImageUrl ? 'AI 编辑提示词' : 'AI 生成提示词'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                inputImageUrl 
                  ? '描述你想要对这张图片做什么修改，比如：添加彩虹、改变风格、增加元素...' 
                  : '描述你想要生成的图片内容，比如：一只可爱的猫在花园里玩耍，卡通风格...'
              }
              className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={generating || isUploading}
            />
          </div>

          {/* AI模型和宽高比设置 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">AI模型</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value as 'flux-kontext-pro' | 'flux-kontext-max')}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={generating || isUploading}
                aria-label="选择AI模型"
                title="选择AI模型"
              >
                <option value="flux-kontext-pro">Flux Kontext Pro</option>
                <option value="flux-kontext-max">Flux Kontext Max</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">宽高比</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={generating || isUploading}
                aria-label="选择宽高比"
                title="选择宽高比"
              >
                <option value="1:1">1:1 正方形</option>
                <option value="16:9">16:9 横屏</option>
                <option value="9:16">9:16 竖屏</option>
                <option value="4:3">4:3 传统</option>
                <option value="3:4">3:4 人像</option>
              </select>
            </div>
          </div>



          {/* 生成状态显示 */}
          {generationStatus && !generationResult && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">{generationStatus}</p>
            </div>
          )}

          {/* AI生成结果展示 */}
          {generationResult && currentUserId && (
            <AIGenerationResult
              status={generationResult}
              prompt={prompt}
              model={model}
              aspectRatio={aspectRatio}
              outputFormat="png"
              userId={currentUserId}
              initialTitle={title}
              onRegenerate={() => {
                setGenerationResult(null)
                if (prompt.trim()) {
                  handleGenerateImage()
                }
              }}
              onTitleChange={(newTitle) => setTitle(newTitle)}
              className="mt-4"
            />
          )}

          {/* 操作按钮 */}
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              onClick={resetPanel} 
              className="flex-1"
              disabled={generating || isUploading}
            >
              重置
            </Button>
            
            <Button 
              onClick={handleGenerateImage} 
              disabled={!prompt.trim() || generating || isUploading}
              className="flex-1"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {inputImageUrl ? 'AI 编辑' : 'AI 生成'}
                </>
              )}
            </Button>
          </div>

          {/* 使用提示 */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-800 mb-2">💡 使用提示</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>纯文本生成</strong>：不选择输入图片，直接输入描述生成全新图像</li>
              <li>• <strong>图生图编辑</strong>：选择输入图片，描述修改要求进行AI编辑</li>
              <li>• <strong>Pro模型</strong>：标准质量，性价比高，适合大多数场景</li>
              <li>• <strong>Max模型</strong>：高质量，适合复杂场景和精细要求</li>
              <li>• <strong>提示词技巧</strong>：详细描述风格、内容、色彩等，效果更好</li>
              <li>• <strong>作品标题</strong>：生成完成后在结果区设置标题，然后保存或发布</li>
            </ul>
          </div>
        </div>
      </div>
    </Card>
  )
}


