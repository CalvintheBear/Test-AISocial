'use client'

import { useState } from 'react'
import { Button, Card } from '@/components/ui'
import { Upload, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { usePostPublishRedirect } from '@/hooks/usePostPublishRedirect'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import { useEffect, useRef } from 'react'
import { useUserArtworks } from '@/hooks/useUserArtworks'

export function CreateArtworkPanel() {
  const [step, setStep] = useState<'generate' | 'preview' | 'publish'>('generate')
  const [prompt, setPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setGeneratedImage(`https://via.placeholder.com/512x512/3b74ff/ffffff?text=${encodeURIComponent(prompt)}`)
    setStep('preview')
    setIsGenerating(false)
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
    // 这里以“生成图像”的占位图模拟上传；真实项目应对接文件选择并用 FormData 上传
    try {
      if (uploadingRef.current) return
      uploadingRef.current = true

      // 模拟文件上传：用 dataURL 占位（真实场景请替换为 <input type="file"/> 文件）
      const file = new File([new Uint8Array([1])], 'placeholder.png', { type: 'image/png' })
      const form = new FormData()
      form.append('file', file)
      form.append('title', title || 'untitled')

      const resp = await fetch(API.base('/api/artworks/upload'), {
        method: 'POST',
        body: form,
        credentials: 'include',
      })
      if (!resp.ok) throw new Error('上传失败')
      const data = await resp.json()
      const payload = data?.success ? data.data : data

      // 本地预插草稿卡片
      if (currentUserId && payload?.id) {
        optimisticAddDraft({
          id: String(payload.id),
          slug: 'draft',
          title: title || 'Untitled',
          thumbUrl: String(payload.thumbUrl || payload.originalUrl),
          author: { id: currentUserId, name: '' },
          likeCount: 0,
          isFavorite: false,
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

  const { redirectToFeed } = usePostPublishRedirect()

  const handlePublish = () => {
    alert('作品已发布！')
    resetPanel()
    redirectToFeed()
  }

  const resetPanel = () => {
    setStep('generate')
    setPrompt('')
    setGeneratedImage(null)
    setTitle('')
  }

  const renderGenerateStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">输入提示词</h3>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要生成的图像..."
          className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">或上传图片</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">拖拽图片到此处或点击上传</p>
          <Button variant="outline" size="sm">选择文件</Button>
        </div>
      </div>
      <Button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className="w-full">
        {isGenerating ? (
          <>
            <Sparkles className="w-4 h-4 mr-2 animate-spin" />
            生成中...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            生成图像
          </>
        )}
      </Button>
    </div>
  )

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">预览效果</h3>
        {generatedImage && (
          <Image src={generatedImage} alt="Generated artwork" width={400} height={400} className="rounded-lg mx-auto" />
        )}
      </div>
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
      <div className="flex space-x-4">
        <Button variant="outline" onClick={() => setStep('generate')} className="flex-1">重新生成</Button>
        <Button onClick={() => setStep('publish')} disabled={!title.trim()} className="flex-1">下一步</Button>
      </div>
    </div>
  )

  const renderPublishStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">发布设置</h3>
        {generatedImage && (
          <Image src={generatedImage} alt="Generated artwork" width={200} height={200} className="rounded-lg mx-auto mb-4" />
        )}
        <p className="text-lg font-medium">{title}</p>
      </div>
      <div className="flex space-x-4">
        <Button variant="outline" onClick={handleSaveDraft} className="flex-1">保存草稿</Button>
        <Button onClick={handlePublish} className="flex-1">立即发布</Button>
      </div>
    </div>
  )

  const renderStep = () => {
    switch (step) {
      case 'generate':
        return renderGenerateStep()
      case 'preview':
        return renderPreviewStep()
      case 'publish':
        return renderPublishStep()
      default:
        return null
    }
  }

  return (
    <Card className="bg-white rounded-lg shadow-xl w-full">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">
          {step === 'generate' && '创建新作品'}
          {step === 'preview' && '预览作品'}
          {step === 'publish' && '发布作品'}
        </h2>
      </div>
      <div className="p-6">
        {renderStep()}
      </div>
    </Card>
  )
}


