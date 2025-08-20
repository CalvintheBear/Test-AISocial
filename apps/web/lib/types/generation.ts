// AI图像生成相关类型定义

export interface GenerationRequest {
  prompt: string
  aspectRatio?: string
  model?: 'flux-kontext-pro' | 'flux-kontext-max'
  inputImage?: string
  outputFormat?: 'png' | 'jpeg'
}

export interface GenerationResponse {
  id: string
  taskId: string
  status: string
}

export interface GenerationStatus {
  id: string
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'timeout'
  taskId?: string
  startedAt?: number
  completedAt?: number
  errorMessage?: string
  resultImageUrl?: string
  originalImageUrl?: string
  inputImageUrl?: string
  model?: string
  aspectRatio?: string
  prompt?: string
  outputFormat?: string
}

export interface ArtworkWithGeneration {
  id: string
  title: string
  url: string
  thumb_url?: string
  status: string
  created_at: number
  updated_at?: number
  published_at?: number
  kie_generation_status?: string
  kie_error_message?: string
  kie_model?: string
  kie_aspect_ratio?: string
  kie_prompt?: string
  kie_output_format?: string
}

// 支持的模型配置
export const SUPPORTED_MODELS = {
  'flux-kontext-pro': {
    name: 'Flux Kontext Pro',
    description: '标准模型，适用于大多数场景，性价比高',
    price: '标准价格'
  },
  'flux-kontext-max': {
    name: 'Flux Kontext Max',
    description: '增强模型，适用于复杂场景，质量更高',
    price: '高级价格'
  }
} as const

// 支持的宽高比
export const SUPPORTED_ASPECT_RATIOS = [
  { value: '1:1', label: '正方形 (1:1)', icon: '⬜' },
  { value: '16:9', label: '横屏 (16:9)', icon: '🖥️' },
  { value: '9:16', label: '竖屏 (9:16)', icon: '📱' },
  { value: '4:3', label: '传统横屏 (4:3)', icon: '📺' },
  { value: '3:4', label: '传统竖屏 (3:4)', icon: '📱' }
] as const

// 支持的输出格式
export const SUPPORTED_OUTPUT_FORMATS = [
  { value: 'png', label: 'PNG', description: '无损压缩，质量更好，文件较大' },
  { value: 'jpeg', label: 'JPEG', description: '有损压缩，文件较小，质量稍差' }
] as const

export type SupportedModel = keyof typeof SUPPORTED_MODELS
export type SupportedAspectRatio = typeof SUPPORTED_ASPECT_RATIOS[number]['value']
export type SupportedOutputFormat = typeof SUPPORTED_OUTPUT_FORMATS[number]['value']

export interface GenerationOptions {
  prompt: string
  aspectRatio: string
  model: 'flux-kontext-pro' | 'flux-kontext-max'
}

export interface GenerationHistory {
  id: string
  prompt: string
  model: string
  aspectRatio: string
  status: GenerationStatus['status']
  resultUrl?: string
  errorMessage?: string
  createdAt: number
  completedAt?: number
}