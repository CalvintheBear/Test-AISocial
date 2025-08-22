"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Save, Upload, CheckCircle2, RefreshCw } from 'lucide-react'
import { authFetch } from '@/lib/api/client'
import { useUserArtworks } from '@/hooks/useUserArtworks'
import { GenerationStatus } from '@/lib/types/generation'

interface AIGenerationResultProps {
  status: GenerationStatus
  prompt: string
  model: string
  aspectRatio: string
  outputFormat: string
  userId: string
  initialTitle?: string
  onRegenerate?: () => void
  onTitleChange?: (title: string) => void
  className?: string
}

export function AIGenerationResult({ 
  status, 
  prompt, 
  model, 
  aspectRatio, 
  outputFormat,
  userId,
  initialTitle,
  onRegenerate,
  onTitleChange,
  className 
}: AIGenerationResultProps) {
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [title, setTitle] = useState(initialTitle || prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''))
  const [showActions, setShowActions] = useState(false)
  
  const { optimisticAddDraft } = useUserArtworks(userId)

  if (status.status !== 'completed' || !status.resultImageUrl) {
    return null
  }

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      alert('请输入作品标题')
      return
    }

    setSaving(true)
    try {
      // 调用保存草稿API
      const payload = await authFetch('/api/artworks/save-draft', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          prompt,
          model,
          aspectRatio,
          outputFormat,
          imageUrl: status.resultImageUrl,
          originalImageUrl: status.originalImageUrl || status.inputImageUrl
        })
      })

      if (payload?.id) {
        // 本地预插草稿卡片
        optimisticAddDraft({
          id: String(payload.id),
          slug: 'draft',
          title: title.trim(),
          thumb_url: status.resultImageUrl || '',
          author: { id: payload.userId || '', name: '' },
          like_count: 0,
          fav_count: 0,
          user_state: {
            liked: false,
            faved: false,
          },
          status: 'draft',
          created_at: Math.floor(Date.now() / 1000),
        })

        alert('草稿已保存！')
        setShowActions(false)
      }
    } catch (error) {
      console.error('保存草稿失败:', error)
      alert('保存草稿失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!title.trim()) {
      alert('请输入作品标题')
      return
    }

    setPublishing(true)
    try {
      // 调用发布API
      const payload = await authFetch('/api/artworks/publish', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          prompt,
          model,
          aspectRatio,
          outputFormat,
          imageUrl: status.resultImageUrl,
          originalImageUrl: status.originalImageUrl || status.inputImageUrl
        })
      })

      if (payload?.id) {
        // 本地预插发布作品卡片
        optimisticAddDraft({
          id: String(payload.id),
          slug: payload.slug || '',
          title: title.trim(),
          thumb_url: status.resultImageUrl || '',
          author: { id: payload.userId || '', name: '' },
          like_count: 0,
          fav_count: 0,
          user_state: {
            liked: false,
            faved: false,
          },
          status: 'published',
          created_at: Math.floor(Date.now() / 1000),
        })

        alert('作品已发布！')
        setShowActions(false)
      }
    } catch (error) {
      console.error('发布失败:', error)
      alert('发布失败，请重试')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            AI 图像生成完成
          </h3>
          <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground shadow-sm">
            {model} • {aspectRatio} • {outputFormat.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* 生成的图像 */}
        <div className="border rounded-lg overflow-hidden bg-gray-50">
          <img 
            src={status.resultImageUrl} 
            alt="AI generated artwork"
            className="w-full h-auto max-h-96 object-contain mx-auto"
          />
        </div>

        {/* 生成信息 */}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">作品标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                const newTitle = e.target.value
                setTitle(newTitle)
                onTitleChange?.(newTitle)
              }}
              placeholder="给你的作品起个名字..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">生成提示词</label>
            <div className="p-3 bg-gray-50 border rounded-lg text-sm text-gray-700">
              {prompt}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">模型：</span>
              <span className="font-medium">{model === 'flux-kontext-pro' ? 'Pro' : 'Max'}</span>
            </div>
            <div>
              <span className="text-gray-500">宽高比：</span>
              <span className="font-medium">{aspectRatio}</span>
            </div>
            <div>
              <span className="text-gray-500">格式：</span>
              <span className="font-medium">{outputFormat.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          {!showActions ? (
            <div className="flex gap-3">
              <Button
                onClick={() => setShowActions(true)}
                className="flex-1"
                size="lg"
              >
                <Save className="w-4 h-4 mr-2" />
                保存或发布
              </Button>
              {onRegenerate && (
                              <Button
                variant="outline"
                onClick={onRegenerate}
                className="flex-1 border-2 hover:bg-accent/50"
                size="lg"
              >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新生成
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={saving || !title.trim()}
                  className="flex-1 border-2 hover:bg-accent/50"
                  size="lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? '保存中...' : '保存草稿'}
                </Button>
                <Button
                  onClick={handlePublish}
                  disabled={publishing || !title.trim()}
                  className="flex-1"
                  size="lg"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {publishing ? '发布中...' : '立即发布'}
                </Button>
              </div>
              
              <Button
                variant="ghost"
                onClick={() => setShowActions(false)}
                className="w-full"
              >
                取消
              </Button>
            </div>
          )}
        </div>

        {/* 提示信息 */}
        <div className="text-xs text-gray-500 space-y-1 bg-blue-50 p-3 rounded-lg">
          <p>💡 <strong>保存草稿</strong>：将作品保存为草稿，稍后可以编辑和发布</p>
          <p>🚀 <strong>立即发布</strong>：将作品直接发布到社区，其他用户可以查看和互动</p>
          <p>🔄 <strong>重新生成</strong>：如果不满意当前结果，可以重新生成</p>
        </div>
      </CardContent>
    </Card>
  )
}
