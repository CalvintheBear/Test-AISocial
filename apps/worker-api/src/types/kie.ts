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
  // 某些情况下taskId可能直接在根级别
  taskId?: string
}

export interface KIEStatusResponse {
  code: number
  msg: string
  data: {
    taskId: string
    successFlag: 0 | 1 | 2 | 3  // 0=GENERATING, 1=SUCCESS, 2=CREATE_TASK_FAILED, 3=GENERATE_FAILED
    response?: {
      resultImageUrl: string
      originImageUrl: string
    }
    errorMessage?: string
    errorCode?: string
    createTime?: string
    completeTime?: string
    paramJson?: string
  }
}

// 更新回调响应类型，使其与官方文档格式一致
export interface KIECallbackResponse {
  code: number
  msg: string
  data: {
    taskId: string
    info?: {
      originImageUrl: string
      resultImageUrl: string
    }
    // 兼容旧版本
    status?: 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'PROCESSING'
    response?: {
      resultUrls?: string[]
      result_urls?: string[]
      resultImageUrl?: string
      originImageUrl?: string
      urls?: string[]
      images?: string[]
      result?: any
    }
    resultUrls?: string[]
    result_urls?: string[]
    resultImageUrl?: string
    originImageUrl?: string
  }
}

export interface GenerationStatus {
  taskId: string
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'timeout'
  startedAt?: number
  completedAt?: number
  errorMessage?: string
  resultImageUrl?: string
  // 添加官方文档的字段
  successFlag?: 0 | 1 | 2 | 3
  originImageUrl?: string
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