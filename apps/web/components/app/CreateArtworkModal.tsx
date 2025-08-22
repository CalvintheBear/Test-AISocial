'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { X, Upload, Sparkles, Image as ImageIcon } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface CreateArtworkModalProps {
  isOpen: boolean
  onClose?: () => void
}

export function CreateArtworkModal({ isOpen, onClose }: CreateArtworkModalProps) {
  const [step, setStep] = useState<'generate' | 'preview' | 'publish'>('generate')
  const [prompt, setPrompt] = useState('')
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  if (!isOpen) return null

  const handleGenerate = async () => {
    setIsGenerating(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setGeneratedImage(`https://via.placeholder.com/512x512/3b74ff/ffffff?text=${encodeURIComponent(prompt)}`)
    setStep('preview')
    setIsGenerating(false)
  }

  const handleSaveDraft = () => {
    alert('草稿已保存！')
    onClose?.()
    resetModal()
  }

  const handlePublish = () => {
    alert('作品已发布！')
    onClose?.()
    resetModal()
  }

  const resetModal = () => {
    setStep('generate')
    setPrompt('')
    setGeneratedImage(null)
    setTitle('')
  }

  const renderGenerateStep = () => (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium mb-2 block">AI 生成提示词</label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要生成的图像... 例如：一只可爱的猫咪，在花园里玩耍，水彩风格"
          className="min-h-[100px] resize-none"
        />
      </div>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">或</span>
        </div>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">上传图片</label>
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-2">拖拽图片到此处或点击上传</p>
          <Button variant="secondary" size="sm">
            <ImageIcon className="w-4 h-4 mr-2" />
            选择文件
          </Button>
        </div>
      </div>
      
      <Button 
        onClick={handleGenerate}
        disabled={!prompt.trim() || isGenerating}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Sparkles className="w-4 h-4 mr-2 animate-spin" />
            AI 生成中...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            AI 生成图像
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
          <div className="relative aspect-square max-w-[400px] mx-auto rounded-lg overflow-hidden">
            <Image
              src={generatedImage}
              alt="Generated artwork"
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">作品标题</label>
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="给你的作品起个名字..."
          className="w-full"
        />
      </div>
      
      <div className="flex space-x-4">
        <Button 
          variant="outline" 
          onClick={() => setStep('generate')}
          className="flex-1"
        >
          重新生成
        </Button>
        <Button 
          onClick={() => setStep('publish')}
          disabled={!title.trim()}
          className="flex-1"
        >
          下一步
        </Button>
      </div>
    </div>
  )

  const renderPublishStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">发布设置</h3>
        {generatedImage && (
          <div className="relative aspect-square w-32 mx-auto rounded-lg overflow-hidden mb-4">
            <Image
              src={generatedImage}
              alt="Generated artwork"
              fill
              className="object-cover"
            />
          </div>
        )}
        <p className="text-lg font-medium text-foreground">{title}</p>
      </div>
      
      <div className="flex space-x-4">
        <Button 
          variant="outline" 
          onClick={handleSaveDraft}
          className="flex-1"
        >
          保存草稿
        </Button>
        <Button 
          onClick={handlePublish}
          className="flex-1"
        >
          立即发布
        </Button>
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
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {step === 'generate' && 'AI 创作新作品'}
            {step === 'preview' && '预览作品'}
            {step === 'publish' && '发布作品'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">关闭</span>
          </Button>
        </div>
        
        <div className="p-6">
          {renderStep()}
        </div>
      </Card>
    </div>
  )
}