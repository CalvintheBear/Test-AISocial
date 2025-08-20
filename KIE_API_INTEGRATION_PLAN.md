# KIE Flux Kontext API 集成计划

## 📋 项目概述

将 KIE Flux Kontext API 集成到 AI Social 项目中，实现 AI 图像生成功能，提升用户创作体验和平台竞争力。

## 🎯 核心目标

1. **AI 图像生成**: 支持文字描述生成艺术作品
2. **异步处理**: 不阻塞用户操作，提供实时状态反馈
3. **无缝集成**: 与现有架构完美融合
4. **用户体验**: 提供流畅的创作工作流

## 🏗️ 技术架构

### 后端架构
```
Worker API (Hono) → KIE API → R2 Storage → D1 Database
```

### 前端架构
```
React Components → Custom Hooks → API Client → State Management
```

## 📁 文件结构规划

### 后端文件结构
```
apps/worker-api/
├── src/
│   ├── services/
│   │   ├── kie-api.ts              # KIE API 服务
│   │   ├── generation-monitor.ts   # 生成状态监控
│   │   └── d1.ts                   # 数据库服务扩展
│   ├── routers/
│   │   └── artworks.ts             # 路由扩展
│   ├── types/
│   │   └── kie.ts                  # KIE 相关类型定义
│   └── utils/
│       └── retry.ts                # 重试机制
├── migrations/
│   └── 003_add_kie_fields.sql      # 数据库迁移
└── wrangler.toml                   # 环境配置
```

### 前端文件结构
```
apps/web/
├── app/
│   └── artwork/
│       └── page.tsx                # 工作台页面重构
├── components/
│   └── app/
│       ├── CreateArtworkPanel.tsx  # 创作面板增强
│       └── GenerationStatus.tsx    # 生成状态组件
├── hooks/
│   ├── useArtworkGeneration.ts     # AI 生成 Hook
│   └── useGenerationStatus.ts      # 状态监控 Hook
├── lib/
│   ├── api/
│   │   └── endpoints.ts            # API 端点扩展
│   └── types/
│       └── generation.ts           # 生成相关类型
└── styles/
    └── generation.css              # 生成相关样式
```

## 🔧 详细实现计划

### Phase 1: 后端基础设施 (Week 1)

#### 1.1 类型定义
```typescript
// apps/worker-api/src/types/kie.ts
export interface KIEGenerateRequest {
  prompt: string
  aspectRatio?: string
  model?: 'flux-kontext-pro' | 'flux-kontext-max'
  inputImage?: string
  enableTranslation?: boolean
  promptUpsampling?: boolean
  safetyTolerance?: number
  callBackUrl?: string
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

export interface GenerationStatus {
  taskId: string
  status: 'pending' | 'generating' | 'completed' | 'failed' | 'timeout'
  startedAt?: number
  completedAt?: number
  errorMessage?: string
  resultImageUrl?: string
}
```

#### 1.2 KIE API 服务
```typescript
// apps/worker-api/src/services/kie-api.ts
export class KIEService {
  private apiKey: string
  private baseUrl = 'https://api.kie.ai/api/v1/flux/kontext'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateImage(prompt: string, options: Partial<KIEGenerateRequest> = {}) {
    const payload = {
      prompt,
      aspectRatio: options.aspectRatio || '1:1',
      model: options.model || 'flux-kontext-pro',
      enableTranslation: options.enableTranslation !== false,
      promptUpsampling: options.promptUpsampling || true,
      safetyTolerance: options.safetyTolerance || 2,
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

    const result: KIEStatusResponse = await response.json()
    
    if (result.code !== 200) {
      throw new Error(`Status check failed: ${result.msg}`)
    }

    return result.data
  }
}
```

#### 1.3 数据库迁移
```sql
-- apps/worker-api/migrations/003_add_kie_fields.sql
-- 添加 KIE 生成相关字段
ALTER TABLE artworks ADD COLUMN kie_task_id TEXT;
ALTER TABLE artworks ADD COLUMN kie_generation_status TEXT DEFAULT 'pending';
ALTER TABLE artworks ADD COLUMN kie_original_image_url TEXT;
ALTER TABLE artworks ADD COLUMN kie_result_image_url TEXT;
ALTER TABLE artworks ADD COLUMN kie_generation_started_at INTEGER;
ALTER TABLE artworks ADD COLUMN kie_generation_completed_at INTEGER;
ALTER TABLE artworks ADD COLUMN kie_error_message TEXT;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_artworks_kie_task_id ON artworks(kie_task_id);
CREATE INDEX IF NOT EXISTS idx_artworks_kie_status ON artworks(kie_generation_status);
```

#### 1.4 数据库服务扩展
```typescript
// apps/worker-api/src/services/d1.ts 扩展
export class D1Service {
  // ... 现有代码 ...

  async updateArtworkGenerationStatus(artworkId: string, status: Partial<GenerationStatus>) {
    const updates = []
    const values = []
    
    if (status.taskId) {
      updates.push('kie_task_id = ?')
      values.push(status.taskId)
    }
    
    if (status.status) {
      updates.push('kie_generation_status = ?')
      values.push(status.status)
    }
    
    if (status.startedAt) {
      updates.push('kie_generation_started_at = ?')
      values.push(status.startedAt)
    }
    
    if (status.completedAt) {
      updates.push('kie_generation_completed_at = ?')
      values.push(status.completedAt)
    }
    
    if (status.errorMessage) {
      updates.push('kie_error_message = ?')
      values.push(status.errorMessage)
    }
    
    if (status.resultImageUrl) {
      updates.push('kie_result_image_url = ?')
      values.push(status.resultImageUrl)
    }
    
    if (updates.length > 0) {
      values.push(artworkId)
      const stmt = this.db.prepare(`
        UPDATE artworks 
        SET ${updates.join(', ')}
        WHERE id = ?
      `)
      await stmt.bind(...values).run()
    }
  }

  async getArtworkByKieTaskId(taskId: string) {
    const stmt = this.db.prepare(`
      SELECT id, kie_generation_status, kie_error_message
      FROM artworks 
      WHERE kie_task_id = ?
    `)
    return await stmt.bind(taskId).first()
  }
}
```

### Phase 2: API 路由实现 (Week 1-2)

#### 2.1 生成路由
```typescript
// apps/worker-api/src/routers/artworks.ts 扩展
router.post('/generate', async (c) => {
  const userId = (c as any).get('userId') as string
  const body = await c.req.json()
  const { prompt, aspectRatio = '1:1', model = 'flux-kontext-pro' } = body

  if (!prompt?.trim()) {
    return c.json(fail('INVALID_INPUT', 'Prompt is required'), 400)
  }

  try {
    const d1 = D1Service.fromEnv(c.env)
    const kie = new KIEService(c.env.KIE_API_KEY)

    // 1. 创建草稿记录
    const artworkId = await d1.createArtwork(userId, 'AI Generated Artwork', '', '', {
      prompt,
      model,
      status: 'generating'
    })

    // 2. 启动 KIE 生成任务
    const taskId = await kie.generateImage(prompt, {
      aspectRatio,
      model,
      promptUpsampling: true
    })

    // 3. 更新数据库状态
    await d1.updateArtworkGenerationStatus(artworkId, {
      taskId,
      status: 'generating',
      startedAt: Date.now()
    })

    // 4. 启动异步监控
    c.executionCtx?.waitUntil?.(monitorGenerationStatus(artworkId, taskId, c.env))

    return c.json(ok({
      id: artworkId,
      taskId,
      status: 'generating'
    }))

  } catch (error) {
    console.error('Generation failed:', error)
    return c.json(fail('GENERATION_ERROR', error.message), 500)
  }
})
```

#### 2.2 状态查询路由
```typescript
router.get('/:id/generation-status', async (c) => {
  const { id } = validateParam(IdParamSchema, { id: c.req.param('id') })
  const userId = (c as any).get('userId') as string

  try {
    const d1 = D1Service.fromEnv(c.env)
    const artwork = await d1.getArtwork(id)

    if (!artwork || artwork.userId !== userId) {
      return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
    }

    const generationStatus = await d1.getArtworkGenerationStatus(id)
    
    return c.json(ok({
      id,
      status: generationStatus?.status || 'unknown',
      taskId: generationStatus?.taskId,
      startedAt: generationStatus?.startedAt,
      completedAt: generationStatus?.completedAt,
      errorMessage: generationStatus?.errorMessage
    }))

  } catch (error) {
    return c.json(fail('INTERNAL_ERROR', 'Failed to check status'), 500)
  }
})
```

### Phase 3: 前端实现 (Week 2-3)

#### 3.1 类型定义
```typescript
// apps/web/lib/types/generation.ts
export interface GenerationRequest {
  prompt: string
  aspectRatio?: string
  model?: 'flux-kontext-pro' | 'flux-kontext-max'
  inputImage?: string
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
}

export interface ArtworkWithGeneration extends ArtworkDetail {
  kie_generation_status?: string
  kie_error_message?: string
}
```

#### 3.2 API 端点扩展
```typescript
// apps/web/lib/api/endpoints.ts 扩展
export const API = {
  // ... 现有端点 ...
  generate: '/api/artworks/generate',
  generationStatus: (id: string) => `/api/artworks/${id}/generation-status`,
}
```

#### 3.3 生成 Hook
```typescript
// apps/web/hooks/useArtworkGeneration.ts
export function useArtworkGeneration() {
  const [generating, setGenerating] = useState(false)
  const [status, setStatus] = useState<string>('')

  const generateImage = useCallback(async (prompt: string, options: GenerationRequest = {}) => {
    setGenerating(true)
    setStatus('正在启动 AI 生成...')

    try {
      const response = await authFetch(API.generate, {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          aspectRatio: options.aspectRatio || '1:1',
          model: options.model || 'flux-kontext-pro',
          inputImage: options.inputImage
        })
      })

      if (response?.id) {
        setStatus('AI 正在生成中，请稍候...')
        return response.id
      }
    } catch (error) {
      setGenerating(false)
      setStatus('')
      throw error
    }
  }, [])

  const pollStatus = useCallback(async (artworkId: string) => {
    const maxAttempts = 60
    let attempts = 0

    const checkStatus = async (): Promise<{ success: boolean; artworkId: string }> => {
      try {
        const statusResponse = await authFetch(API.generationStatus(artworkId))
        
        if (statusResponse.status === 'completed') {
          setStatus('生成完成！')
          setGenerating(false)
          return { success: true, artworkId }
        }

        if (statusResponse.status === 'failed') {
          setStatus('生成失败')
          setGenerating(false)
          throw new Error(statusResponse.errorMessage || '生成失败')
        }

        if (attempts < maxAttempts) {
          attempts++
          setStatus(`AI 正在生成中... (${attempts}/${maxAttempts})`)
          await new Promise(resolve => setTimeout(resolve, 5000))
          return checkStatus()
        } else {
          setStatus('生成超时')
          setGenerating(false)
          throw new Error('生成超时')
        }
      } catch (error) {
        setGenerating(false)
        setStatus('')
        throw error
      }
    }

    return checkStatus()
  }, [])

  return {
    generating,
    status,
    generateImage,
    pollStatus
  }
}
```

#### 3.4 工作台页面重构
```typescript
// apps/web/app/artwork/page.tsx
"use client"
import { CreateArtworkPanel } from '@/components/app/CreateArtworkPanel'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ArtworkPage() {
  const [activeTab, setActiveTab] = useState('generate')

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">AI 创作工作台</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="generate">🤖 AI 生成</TabsTrigger>
          <TabsTrigger value="upload">📤 上传图片</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate">
          <CreateArtworkPanel mode="generate" />
        </TabsContent>
        
        <TabsContent value="upload">
          <CreateArtworkPanel mode="upload" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### Phase 4: 组件实现 (Week 3)

#### 4.1 创作面板组件
```typescript
// apps/web/components/app/CreateArtworkPanel.tsx
interface CreateArtworkPanelProps {
  mode: 'generate' | 'upload'
}

export function CreateArtworkPanel({ mode }: CreateArtworkPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [model, setModel] = useState<'flux-kontext-pro' | 'flux-kontext-max'>('flux-kontext-pro')
  const [generationId, setGenerationId] = useState<string | null>(null)
  
  const { generating, status, generateImage, pollStatus } = useArtworkGeneration()

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('请输入生成提示词')
      return
    }

    try {
      const artworkId = await generateImage(prompt, {
        aspectRatio,
        model
      })

      setGenerationId(artworkId)
      await pollStatus(artworkId)
      
    } catch (error) {
      console.error('Generation failed:', error)
      alert('AI 生成失败，请重试')
    }
  }

  const renderGenerateMode = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">生成提示词</label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="描述你想要的艺术作品..."
          className="w-full h-32"
          disabled={generating}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">画布比例</label>
          <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={generating}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1:1">正方形 (1:1)</SelectItem>
              <SelectItem value="16:9">宽屏 (16:9)</SelectItem>
              <SelectItem value="4:3">标准 (4:3)</SelectItem>
              <SelectItem value="3:4">竖屏 (3:4)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">AI 模型</label>
          <Select value={model} onValueChange={(value: any) => setModel(value)} disabled={generating}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flux-kontext-pro">标准版</SelectItem>
              <SelectItem value="flux-kontext-max">增强版</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {status && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">{status}</p>
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={generating || !prompt.trim()}
        className="w-full"
      >
        {generating ? 'AI 生成中...' : '开始生成'}
      </Button>
    </div>
  )

  return (
    <Card className="bg-white rounded-lg shadow-xl w-full">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">
          {mode === 'generate' ? '🤖 AI 智能生成' : '📤 上传作品'}
        </h2>
      </div>
      
      <div className="p-6">
        {mode === 'generate' ? renderGenerateMode() : renderUploadMode()}
      </div>
    </Card>
  )
}
```

### Phase 5: 环境配置 (Week 1)

#### 5.1 Wrangler 配置
```toml
# apps/worker-api/wrangler.toml
[vars]
KIE_API_KEY = "your_kie_api_key_here"
API_BASE_URL = "https://your-domain.com"

# 或者使用 secrets
# wrangler secret put KIE_API_KEY
```

#### 5.2 环境变量
```bash
# .env.local
NEXT_PUBLIC_KIE_ENABLED=true
KIE_API_KEY=your_api_key_here
```

### Phase 6: 测试和优化 (Week 4)

#### 6.1 单元测试
```typescript
// apps/worker-api/src/services/__tests__/kie-api.test.ts
describe('KIEService', () => {
  it('should generate image successfully', async () => {
    const kie = new KIEService('test-api-key')
    const taskId = await kie.generateImage('test prompt')
    expect(taskId).toBeDefined()
  })

  it('should handle generation errors', async () => {
    const kie = new KIEService('invalid-key')
    await expect(kie.generateImage('test')).rejects.toThrow()
  })
})
```

#### 6.2 集成测试
```typescript
// apps/worker-api/src/routers/__tests__/artworks.test.ts
describe('Artwork Generation', () => {
  it('should start generation process', async () => {
    const response = await app.request('/api/artworks/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test prompt' })
    })
    
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.data.id).toBeDefined()
    expect(data.data.taskId).toBeDefined()
  })
})
```

## 🚀 部署计划

### 开发环境部署
1. 配置 KIE API Key
2. 运行数据库迁移
3. 部署 Worker API
4. 测试生成功能

### 生产环境部署
1. 设置生产环境变量
2. 配置域名和 SSL
3. 部署前端和后端
4. 监控和日志配置

## 📊 监控和日志

### 关键指标
- 生成成功率
- 平均生成时间
- API 调用频率
- 错误率统计

### 日志记录
```typescript
// 生成开始
console.log(JSON.stringify({
  level: 'info',
  event: 'generation_started',
  artworkId,
  taskId,
  prompt: prompt.substring(0, 100) // 截断敏感信息
}))

// 生成完成
console.log(JSON.stringify({
  level: 'info',
  event: 'generation_completed',
  artworkId,
  taskId,
  duration: Date.now() - startTime
}))

// 生成失败
console.log(JSON.stringify({
  level: 'error',
  event: 'generation_failed',
  artworkId,
  taskId,
  error: error.message
}))
```

## 🔒 安全和隐私

### API Key 管理
- 使用 Wrangler Secrets 存储
- 定期轮换 API Key
- 监控异常使用

### 内容审核
- 集成 KIE API 的安全过滤
- 用户生成内容审核
- 举报机制

### 数据保护
- 用户提示词隐私保护
- 生成图片存储安全
- 数据删除机制

## 📈 性能优化

### 缓存策略
- 生成结果缓存
- 状态查询缓存
- CDN 图片加速

### 并发控制
- API 调用限流
- 队列处理机制
- 资源使用监控

## 🎯 成功指标

### 技术指标
- 生成成功率 > 95%
- 平均生成时间 < 3分钟
- API 响应时间 < 500ms
- 系统可用性 > 99.9%

### 业务指标
- 用户生成作品数量
- 生成作品发布率
- 用户留存率提升
- 平台活跃度增长

## 📝 后续优化

### 功能扩展
- 批量生成
- 风格预设
- 图片编辑
- 社区模板

### 技术优化
- 模型选择优化
- 提示词增强
- 生成质量提升
- 成本优化

---

**文档版本**: v1.0  
**最后更新**: 2024-12-20  
**负责人**: 开发团队  
**审核人**: 技术负责人
