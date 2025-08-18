'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { artworkStateManager } from '@/lib/artworkStateManager'

export function NavigationRefresh() {
  const pathname = usePathname()

  useEffect(() => {
    // 监听路由变化
    const handleRouteChange = () => {
      // 根据页面类型执行不同刷新策略
      const refreshStrategy = {
        '/feed': () => artworkStateManager.refreshFeed(),
        '/user/': () => artworkStateManager.refreshUserFavorites(),
        '/artwork/': () => artworkStateManager.refreshAll()
      }

      Object.entries(refreshStrategy).forEach(([path, refreshFn]) => {
        if (pathname.startsWith(path)) {
          setTimeout(refreshFn, 100)
        }
      })
    }

    handleRouteChange()
  }, [pathname])

  return null
}