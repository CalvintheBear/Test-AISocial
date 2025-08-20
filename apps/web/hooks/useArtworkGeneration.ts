import { useState, useCallback } from 'react'
import { GenerationRequest, GenerationResponse, GenerationStatus } from '@/lib/types/generation'
import { authFetch } from '@/lib/api/client'

export function useArtworkGeneration() {
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [currentTask, setCurrentTask] = useState<{
    artworkId: string
    taskId: string
  } | null>(null)

  const generateImage = useCallback(async (prompt: string, options: Partial<GenerationRequest> = {}): Promise<string> => {
    setGenerating(true)
    setStatus('正在启动 AI 生成...')

    try {
      const response = await authFetch('/api/artworks/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          aspectRatio: options.aspectRatio || '1:1',
          model: options.model || 'flux-kontext-pro',
          outputFormat: options.outputFormat || 'png',
          inputImage: options.inputImage
        })
      })

      if (response?.id) {
        setStatus('AI 正在生成中，请稍候...')
        setCurrentTask({
          artworkId: response.id,
          taskId: response.taskId
        })
        return response.id
      }
      
      throw new Error('生成请求失败')
    } catch (error) {
      setGenerating(false)
      setStatus('')
      setCurrentTask(null)
      throw error
    }
  }, [])

  const pollStatus = useCallback(async (taskId: string): Promise<{ success: boolean; taskId: string; resultImageUrl?: string; originalImageUrl?: string }> => {
    const maxAttempts = 60 // 5分钟超时
    let attempts = 0

    const checkStatus = async (): Promise<{ success: boolean; taskId: string; resultImageUrl?: string; originalImageUrl?: string }> => {
      try {
        // 使用新的taskId状态查询接口
        const statusResponse = await authFetch(`/api/artworks/task-status/${taskId}`)
        
        if (statusResponse.status === 'completed') {
          setStatus('生成完成！')
          setGenerating(false)
          setCurrentTask(null)
          return { 
            success: true, 
            taskId,
            resultImageUrl: statusResponse.resultImageUrl,
            originalImageUrl: statusResponse.originalImageUrl
          }
        }

        if (statusResponse.status === 'failed') {
          setStatus('生成失败')
          setGenerating(false)
          setCurrentTask(null)
          throw new Error(statusResponse.errorMessage || '生成失败')
        }

        if (attempts < maxAttempts) {
          attempts++
          setStatus(`AI 正在生成中... (${attempts}/${maxAttempts})`)
          await new Promise(resolve => setTimeout(resolve, 5000)) // 5秒检查一次
          return checkStatus()
        } else {
          setStatus('生成超时')
          setGenerating(false)
          setCurrentTask(null)
          throw new Error('生成超时')
        }
      } catch (error) {
        setGenerating(false)
        setStatus('')
        setCurrentTask(null)
        throw error
      }
    }

    return checkStatus()
  }, [])

  const regenerateImage = useCallback(async (artworkId: string, prompt: string, options: Partial<GenerationRequest> = {}): Promise<string> => {
    setGenerating(true)
    setStatus('正在重新生成...')

    try {
      const response = await authFetch(`/api/artworks/${artworkId}/regenerate`, {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          aspectRatio: options.aspectRatio || '1:1',
          model: options.model || 'flux-kontext-pro',
          outputFormat: options.outputFormat || 'png'
        })
      })

      if (response?.taskId) {
        setStatus('AI 正在重新生成中，请稍候...')
        setCurrentTask({
          artworkId,
          taskId: response.taskId
        })
        return artworkId
      }
      
      throw new Error('重新生成请求失败')
    } catch (error) {
      setGenerating(false)
      setStatus('')
      setCurrentTask(null)
      throw error
    }
  }, [])

  const cancelGeneration = useCallback(() => {
    setGenerating(false)
    setStatus('')
    setCurrentTask(null)
  }, [])

  return {
    generating,
    status,
    currentTask,
    generateImage,
    regenerateImage,
    pollStatus,
    cancelGeneration
  }
}

export function useGenerationStatus(artworkId?: string) {
  const [status, setStatus] = useState<GenerationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      // 使用新的taskId状态查询接口
      const response = await authFetch(`/api/artworks/task-status/${id}`)
      setStatus(response)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取状态失败'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshStatus = useCallback(() => {
    if (artworkId) {
      fetchStatus(artworkId)
    }
  }, [artworkId, fetchStatus])

  return {
    status,
    loading,
    error,
    fetchStatus,
    refreshStatus
  }
}