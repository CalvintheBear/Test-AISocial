import { FC } from 'react'
import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react'
import { GenerationStatus as GenerationStatusType } from '@/lib/types/generation'

interface GenerationStatusProps {
  status: GenerationStatusType | null
  className?: string
}

export const GenerationStatus: FC<GenerationStatusProps> = ({ status, className = '' }) => {
  if (!status) return null

  const getStatusIcon = () => {
    switch (status.status) {
      case 'generating':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'timeout':
        return <Clock className="h-4 w-4 text-orange-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = () => {
    switch (status.status) {
      case 'generating':
        return 'AI 正在生成中...'
      case 'completed':
        return '生成完成！'
      case 'failed':
        return status.errorMessage || '生成失败'
      case 'timeout':
        return '生成超时'
      case 'pending':
        return '等待生成开始...'
      default:
        return '未知状态'
    }
  }

  const getStatusColor = () => {
    switch (status.status) {
      case 'generating':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'timeout':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'pending':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className={`flex items-center space-x-2 p-3 rounded-lg border ${getStatusColor()} ${className}`}>
      {getStatusIcon()}
      <span className="text-sm font-medium">{getStatusText()}</span>
      
      {status.status === 'generating' && (
        <span className="text-xs text-gray-500">
          {status.startedAt && 
            `已用时 ${Math.floor((Date.now() - status.startedAt) / 1000 / 60)} 分钟`
          }
        </span>
      )}
    </div>
  )
}

interface GenerationProgressProps {
  status: GenerationStatusType | null
}

export const GenerationProgress: FC<GenerationProgressProps> = ({ status }) => {
  if (!status || status.status === 'completed') return null

  const getProgress = () => {
    if (status.status === 'pending') return 10
    if (status.status === 'generating' && status.startedAt) {
      const elapsed = Date.now() - status.startedAt
      const estimatedTotal = 180000 // 3分钟
      return Math.min(90, Math.floor((elapsed / estimatedTotal) * 100))
    }
    return 100
  }

  const progress = getProgress()

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>AI 生成进度</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

interface GenerationResultProps {
  status: GenerationStatusType | null
  onUseImage?: () => void
  onRegenerate?: () => void
}

export const GenerationResult: FC<GenerationResultProps> = ({ 
  status, 
  onUseImage, 
  onRegenerate 
}) => {
  if (!status || status.status !== 'completed') return null

  return (
    <div className="space-y-4">
      {status.resultImageUrl && (
        <div className="border rounded-lg overflow-hidden">
          <img 
            src={status.resultImageUrl} 
            alt="AI generated artwork"
            className="w-full h-auto"
          />
        </div>
      )}
      
      <div className="flex gap-2">
        {onUseImage && (
          <button
            onClick={onUseImage}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            使用此图片
          </button>
        )}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            重新生成
          </button>
        )}
      </div>
    </div>
  )
}