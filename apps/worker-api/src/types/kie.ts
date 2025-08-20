// KIE Flux Kontext API 集成相关类型定义

export interface KIEGenerateRequest {
  prompt: string
  aspectRatio?: string
  model?: 'flux-kontext-pro' | 'flux-kontext-max'
  inputImage?: string
  enableTranslation?: boolean
  promptUpsampling?: boolean
  safetyTolerance?: number
  callBackUrl?: string
  outputFormat?: 'png' | 'jpeg'
  watermark?: string
  uploadCn?: boolean
}

export interface KIEGenerateResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

export interface KIEStatusResponse {
  code: number
  msg: string
  data: {
    successFlag: 0 | 1 | 2 | 3
    response?: {
      resultImageUrl: string
      originImageUrl: string
    }
    errorMessage?: string
    errorCode?: string
  }
}

// 添加回调响应类型
export interface KIECallbackResponse {
  code: number
  msg: string
  data: {
    taskId: string
    info?: {
      originImageUrl: string
      resultImageUrl: string
    }
  }
}

export interface GenerationStatus {
  taskId: string
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'timeout'
  startedAt?: number
  completedAt?: number
  errorMessage?: string
  resultImageUrl?: string
}

export interface KIEArtworkData {
  id: string
  kieTaskId?: string
  kieGenerationStatus: 'pending' | 'generating' | 'completed' | 'failed' | 'timeout'
  kieOriginalImageUrl?: string
  kieResultImageUrl?: string
  kieGenerationStartedAt?: number
  kieGenerationCompletedAt?: number
  kieErrorMessage?: string
}

export interface KIEGenerationConfig {
  apiKey: string
  baseUrl: string
  defaultModel: 'flux-kontext-pro' | 'flux-kontext-max'
  defaultAspectRatio: string
  maxRetryAttempts: number
  retryDelay: number
  timeout: number
}