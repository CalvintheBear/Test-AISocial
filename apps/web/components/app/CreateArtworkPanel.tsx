'use client'

import { useState, useEffect, useRef } from 'react'
import { Button, Card } from '@/components/ui'
import { Upload } from 'lucide-react'
import { usePostPublishRedirect } from '@/hooks/usePostPublishRedirect'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import { useUserArtworks } from '@/hooks/useUserArtworks'

export function CreateArtworkPanel() {
  const [step, setStep] = useState<'upload' | 'publish'>('upload')
  const [prompt, setPrompt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFile(f)
    setPreviewUrl(f ? URL.createObjectURL(f) : null)
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

  const handlePublish = async () => {
    alert('请在个人主页对草稿执行发布操作（此处仅保存草稿）。')
  }

  const resetPanel = () => {
    setStep('upload')
    setPrompt('')
    setFile(null)
    setPreviewUrl(null)
    setTitle('')
  }

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">上传图片</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-2">选择一张要上传的图片</p>
          <label className="block">
            <span className="sr-only">选择图片文件</span>
            <input aria-label="选择图片文件" title="选择图片文件" type="file" accept="image/*" onChange={onFileChange} className="block mx-auto" />
          </label>
          {previewUrl && (
            <img src={previewUrl} alt="预览" className="mt-4 mx-auto rounded max-w-[256px]" />
          )}
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2">提示词（可选）</h3>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要的风格/内容..."
          className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
        <Button variant="outline" onClick={() => resetPanel()} className="flex-1">重置</Button>
        <Button onClick={handleSaveDraft} disabled={!file || !title.trim()} className="flex-1">保存草稿</Button>
      </div>
    </div>
  )

  const renderPreviewStep = () => null

  const renderPublishStep = () => null

  const renderStep = () => {
    switch (step) {
      case 'upload':
        return renderUploadStep()
      case 'publish':
        return renderPublishStep()
      default:
        return null
    }
  }

  return (
    <Card className="bg-white rounded-lg shadow-xl w-full">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">上传/草稿</h2>
      </div>
      <div className="p-6">
        {renderStep()}
      </div>
    </Card>
  )
}


