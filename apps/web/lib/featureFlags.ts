export const FEATURE_FLAGS = {
  USE_NEW_LIKE_SYSTEM: true, // 设置为true启用新系统
  USE_OPTIMISTIC_CACHE: true, // 缓存策略开关
  DEBUG_API_CALLS: false, // 调试开关
} as const

export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  // 支持通过URL参数覆盖
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search)
    const paramValue = urlParams.get(flag.toLowerCase())
    if (paramValue !== null) {
      return paramValue === '1' || paramValue === 'true'
    }
  }
  
  return FEATURE_FLAGS[flag]
}