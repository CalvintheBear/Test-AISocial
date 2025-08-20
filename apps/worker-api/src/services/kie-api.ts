import { KIEGenerateRequest, KIEGenerateResponse, KIEStatusResponse, GenerationStatus } from '../types/kie'

export class KIEService {
  private apiKey: string
  private baseUrl = 'https://api.kie.ai/api/v1/flux/kontext'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateImage(prompt: string, options: Partial<KIEGenerateRequest> = {}): Promise<string> {
    const payload = {
      prompt,
      aspectRatio: options.aspectRatio || '1:1',
      model: options.model || 'flux-kontext-pro',
      enableTranslation: options.enableTranslation !== false,
      promptUpsampling: options.promptUpsampling || false, // 默认关闭，避免额外费用
      safetyTolerance: options.safetyTolerance || 2,
      outputFormat: 'png', // 默认使用PNG格式，质量更好
      ...(options.inputImage && { inputImage: options.inputImage }),
      ...(options.callBackUrl && { callBackUrl: options.callBackUrl })
    }

    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`KIE API HTTP Error: ${response.status}`)
    }

    const result: KIEGenerateResponse = await response.json()
    
    if (result.code !== 200) {
      throw new Error(`KIE API Error: ${result.msg}`)
    }

    return result.data.taskId
  }

  async getTaskStatus(taskId: string): Promise<KIEStatusResponse['data']> {
    const response = await fetch(`${this.baseUrl}/record-info?taskId=${taskId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`KIE API HTTP Error: ${response.status}`)
    }

    const result: KIEStatusResponse = await response.json()
    
    if (result.code !== 200) {
      throw new Error(`Status check failed: ${result.msg}`)
    }

    return result.data
  }

  async getGenerationStatus(taskId: string): Promise<GenerationStatus> {
    const data = await this.getTaskStatus(taskId)
    
    let status: GenerationStatus['status']
    // 根据KIE API文档，successFlag含义：
    // 0: pending, 1: generating, 2: completed, 3: failed
    switch (data.successFlag) {
      case 0:
        status = 'pending'
        break
      case 1:
        status = 'generating'
        break
      case 2:
        status = 'completed'
        break
      case 3:
        status = 'failed'
        break
      default:
        status = 'pending'
    }

    return {
      taskId,
      status,
      resultImageUrl: data.response?.resultImageUrl,
      errorMessage: data.errorMessage
    }
  }

  async waitForCompletion(taskId: string, maxWaitMs = 180000, checkInterval = 5000): Promise<GenerationStatus> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getGenerationStatus(taskId)
      
      if (status.status === 'completed' || status.status === 'failed') {
        return status
      }
      
      if (status.status === 'timeout') {
        return { ...status, status: 'timeout' }
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval))
    }
    
    return {
      taskId,
      status: 'timeout',
      errorMessage: 'Generation timeout'
    }
  }
}