'use client'

import { useState, useEffect, useRef } from 'react'
import { Button, Card } from '@/components/ui'
import { Upload, Sparkles, Loader2, Image, Wand2 } from 'lucide-react'
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
  const [creationMode, setCreationMode] = useState<'upload' | 'ai'>('upload')
  const [prompt, setPrompt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [model, setModel] = useState<'flux-kontext-pro' | 'flux-kontext-max'>('flux-kontext-pro')
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [generationResult, setGenerationResult] = useState<any>(null)

  const { generating, status: generationStatus, generateImage, pollStatus, regenerateImage } = useArtworkGeneration()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFile(f)
    setPreviewUrl(f ? URL.createObjectURL(f) : null)
    // 如果切换到上传模式，清空AI生成相关状态
    if (creationMode === 'ai') {
      setCreationMode('upload')
      setPrompt('')
      setGenerationResult(null)
    }
  }

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const { optimisticAddDraft } = useUserArtworks(currentUserId || '')
  const uploadingRef = useRef(false)

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

  const handleSaveDraft = async () => {
    if (!file || !title.trim()) {
      alert('请先选择图片并填写标题')
      return
    }
    try {
      if (uploadingRef.current) return
      uploadingRef.current = true

      const form = new FormData()
      form.append('file', file)
      form.append('title', title || 'untitled')
      form.append('prompt', prompt || '')
      
      const payload = await authFetch('/api/artworks/upload', {
        method: 'POST',
        body: form,
      })

      // 本地预插草稿卡片
      if (currentUserId && payload?.id) {
        optimisticAddDraft({
          id: String(payload.id),
          slug: 'draft',
          title: title || 'Untitled',
          thumb_url: String(payload.thumbUrl || payload.originalUrl || ''),
          author: { id: currentUserId, name: '' },
          like_count: 0,
          fav_count: 0,
          user_state: {
            liked: false,
            faved: false,
          },
          status: 'draft',
        })
      }

      alert('草稿已保存！')
      resetPanel()
    } catch (e) {
      alert('保存草稿失败')
    } finally {
      uploadingRef.current = false
    }
  }

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      alert('请输入生成提示词')
      return
    }

    try {
      const id = await generateImage(prompt, {
        aspectRatio,
        model
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
          originalImageUrl: pollResult.originalImageUrl || ''
        })
        setTitle(prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''))
      }
    } catch (err) {
      alert('生成失败：' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  const resetPanel = () => {
    setCreationMode('upload')
    setPrompt('')
    setFile(null)
    setPreviewUrl(null)
    setTitle('')
    setGenerationResult(null)
    setGenerationId(null)
  }

  const switchToAIMode = () => {
    setCreationMode('ai')
    setFile(null)
    setPreviewUrl(null)
    setPrompt('')
    setGenerationResult(null)
  }

  const switchToUploadMode = () => {
    setCreationMode('upload')
    setPrompt('')
    setGenerationResult(null)
    setGenerationId(null)
  }

  return (
    <Card className={`bg-white rounded-lg shadow-xl w-full ${className || ''}`}>
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">创建作品</h2>
        <p className="text-sm text-gray-600 mt-1">上传图片或使用AI生成，创建你的艺术作品</p>
      </div>
      
      <div className="p-6">
        {/* 创作模式选择 */}
        <div className="mb-6">
          <div className="flex space-x-2 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={switchToUploadMode}
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-all ${
                creationMode === 'upload'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Image className="w-4 h-4 mr-2" />
              上传图片
            </button>
            <button
              onClick={switchToAIMode}
              className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-all ${
                creationMode === 'ai'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              AI 生成
            </button>
          </div>
        </div>

        {/* 统一的内容区域 */}
        <div className="space-y-6">
          {/* 提示词输入 - 两种模式都需要 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {creationMode === 'upload' ? '作品描述（可选）' : 'AI 生成提示词'}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                creationMode === 'upload' 
                  ? '描述你的作品风格、内容或创作灵感...' 
                  : '描述你想要生成的图片内容，比如：一只可爱的猫在花园里玩耍，卡通风格...'
              }
              className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={generating}
            />
          </div>

          {/* 上传模式特有内容 */}
          {creationMode === 'upload' && (
            <div>
              <label className="block text-sm font-medium mb-2">选择图片</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">选择一张要上传的图片</p>
                <label className="block">
                  <span className="sr-only">选择图片文件</span>
                  <input 
                    aria-label="选择图片文件" 
                    title="选择图片文件" 
                    type="file" 
                    accept="image/*" 
                    onChange={onFileChange} 
                    className="block mx-auto" 
                  />
                </label>
                {previewUrl && (
                  <div className="mt-4">
                    <img src={previewUrl} alt="预览" className="mx-auto rounded max-w-[256px] shadow-lg" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI模式特有内容 */}
          {creationMode === 'ai' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">AI模型</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as 'flux-kontext-pro' | 'flux-kontext-max')}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={generating}
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
                  disabled={generating}
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
          )}

          {/* 作品标题 - 两种模式都需要 */}
          <div>
            <label className="block text-sm font-medium mb-2">作品标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的作品起个名字..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
              onRegenerate={() => {
                setGenerationResult(null)
                if (prompt.trim()) {
                  handleGenerateImage()
                }
              }}
              className="mt-4"
            />
          )}

          {/* 操作按钮 */}
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              onClick={resetPanel} 
              className="flex-1"
              disabled={generating}
            >
              重置
            </Button>
            
            {creationMode === 'upload' ? (
              <Button 
                onClick={handleSaveDraft} 
                disabled={!file || !title.trim()} 
                className="flex-1"
              >
                保存草稿
              </Button>
            ) : (
              <Button 
                onClick={handleGenerateImage} 
                disabled={!prompt.trim() || generating}
                className="flex-1"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI 生成
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}


