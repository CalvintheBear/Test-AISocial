import { KIEGenerateRequest, KIEGenerateResponse, KIEStatusResponse, GenerationStatus } from '../types/kie'

export class KIEService {
  private apiKey: string
  private baseUrl = 'https://api.kie.ai/api/v1/flux/kontext'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateImage(prompt: string, options: Partial<KIEGenerateRequest> = {}): Promise<string> {
    // 组装 Flux Kontext 请求体（严格遵循官方文档）
    const requestBody: Record<string, any> = {
      prompt,
      aspectRatio: options.aspectRatio || '1:1',
      model: options.model || 'flux-kontext-pro',
      enableTranslation: options.enableTranslation !== false,
      outputFormat: options.outputFormat || 'png',
      promptUpsampling: options.promptUpsampling || false,
    }
    
    if (options.inputImage && typeof options.inputImage === 'string' && options.inputImage.trim() !== '') {
      requestBody.inputImage = options.inputImage
    }

    // 注入回调（统一由服务端设置，避免前端拼接）
    if (options.callBackUrl) {
      requestBody.callBackUrl = options.callBackUrl
    }

    console.log('📤 发送请求到 Flux Kontext API:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${this.baseUrl}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Flux Kontext API HTTP Error: ${response.status} - ${errorText}`)
    }

    const result: KIEGenerateResponse = await response.json()
    console.log('✅ Flux Kontext API 响应:', result)
    
    if (result.code !== 200) {
      throw new Error(`Flux Kontext API Error: ${result.msg}`)
    }

    // 官方响应：{ code: 200, msg: 'success', data: { taskId: '...' } }
    const taskId = result?.data?.taskId || result?.taskId
    if (!taskId) {
      throw new Error('未获取到任务ID')
    }

    return taskId
  }

  async getTaskStatus(taskId: string): Promise<KIEStatusResponse['data']> {
    const response = await fetch(`${this.baseUrl}/record-info?taskId=${taskId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Flux Kontext API HTTP Error: ${response.status}`)
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
    // 根据官方文档，successFlag含义：
    // 0: GENERATING (正在生成), 1: SUCCESS (成功), 2: CREATE_TASK_FAILED (创建任务失败), 3: GENERATE_FAILED (生成失败)
    switch (data.successFlag) {
      case 0:
        status = 'generating'
        break
      case 1:
        status = 'completed'
        break
      case 2:
      case 3:
        status = 'failed'
        break
      default:
        status = 'generating'
    }

    return {
      taskId,
      status,
      successFlag: data.successFlag,
      resultImageUrl: data.response?.resultImageUrl,
      originImageUrl: data.response?.originImageUrl,
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
      
      await new Promise(resolve => setTimeout(resolve, checkInterval))
    }
    
    throw new Error('Generation timeout')
  }
}