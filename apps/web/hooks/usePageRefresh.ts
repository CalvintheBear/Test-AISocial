import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { artworkStateManager } from '@/lib/artworkStateManager'

export function usePageRefresh() {
  const pathname = usePathname()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshPageData = useCallback(async () => {
    setIsRefreshing(true)
    
    try {
      // 根据页面类型刷新对应数据
      const refreshStrategy = {
        '/feed': () => artworkStateManager.refreshFeed(),
        '/user/': () => artworkStateManager.refreshUserFavorites(),
        '/artwork/': () => artworkStateManager.refreshAll()
      }

      Object.entries(refreshStrategy).forEach(([path, refreshFn]) => {
        if (pathname.startsWith(path)) {
          refreshFn()
        }
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [pathname])

  // 页面加载时立即刷新
  useEffect(() => {
    refreshPageData()
  }, [pathname])

  return { isRefreshing, refresh: refreshPageData }
}