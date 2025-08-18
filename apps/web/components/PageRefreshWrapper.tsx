'use client'

import { usePageRefresh } from '@/hooks/usePageRefresh'

interface PageRefreshWrapperProps {
  children: React.ReactNode
  pageType: string
}

export function PageRefreshWrapper({ children, pageType }: PageRefreshWrapperProps) {
  const { isRefreshing, refresh } = usePageRefresh()

  return (
    <div className="relative">
      {isRefreshing && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-2 py-1 rounded text-sm z-50">
          正在刷新数据...
        </div>
      )}
      {children}
    </div>
  )
}