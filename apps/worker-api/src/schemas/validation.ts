import { z } from 'zod'

// 基础ID参数校验 - 支持任意字符串ID格式
export const IdParamSchema = z.object({
  id: z.string().min(1, 'ID不能为空')
})

// 用户ID参数校验
export const UserIdParamSchema = z.object({
  id: z.string().min(1, '用户ID不能为空')
})

// 分页参数校验
export const PaginationQuerySchema = z.object({
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      const raw = val === undefined ? '20' : String(val)
      const num = parseInt(raw)
      return Math.max(1, Math.min(100, Number.isFinite(num) ? num : 20))
    }),
})

// 文件上传参数校验
export const UploadArtworkSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题不能超过100字符'),
  file: z.instanceof(File, { message: '必须提供文件' })
})

// 错误响应类型
export type ApiError = {
  code: string
  message: string
}

// 验证辅助函数
export function validateParam<T>(schema: z.ZodSchema<T>, data: any): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      const err = new Error(message)
      ;(err as any).code = 'VALIDATION_ERROR'
      ;(err as any).status = 400
      throw err
    }
    throw error
  }
}