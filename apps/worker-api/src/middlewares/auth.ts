import type { Context, Next } from 'hono'

export async function authMiddleware(c: Context, next: Next) {
  const devMode = c.env?.DEV_MODE === '1' || !c.env?.CLERK_ISSUER
  if (devMode) {
    // 注入开发态 userId（Hono Context 允许自定义变量）
    ;(c as any).set('userId', 'dev-user')
    return next()
  }
  const auth = c.req.header('authorization') || c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ code: 'AUTH_REQUIRED' }, 401)
  // TODO: 使用 @clerk/backend 验证 token（后续接入）
  ;(c as any).set('userId', 'todo-from-clerk')
  return next()
}


