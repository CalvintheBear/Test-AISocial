'use client'

import useSWR from 'swr'
import { ArtworkGrid } from '@/components/app/ArtworkGrid'
import { API } from '@/lib/api/endpoints'
import { ArtworkListItem } from '@/lib/types'
import { useLike } from '@/hooks/useLike'
import { useFavorite } from '@/hooks/useFavorite'
import { useState, useCallback } from 'react'

interface TrendingTabProps {
  timeWindow?: '24h' | '7d' | '30d'
}

export default function TrendingTab({ timeWindow = '24h' }: TrendingTabProps) {
  const { data: trendingData, error, isLoading } = useSWR(
    `${API.trending}?timeWindow=${timeWindow}&limit=50`,
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch trending')
      const json = await res.json()
      return json.data as ArtworkListItem[]
    },
    {
      refreshInterval: 300000, // 5分钟刷新一次
      revalidateOnFocus: false,
    }
  )

  const { like } = useLike()
  const { addFavorite, removeFavorite } = useFavorite()
  const [artworks, setArtworks] = useState<ArtworkListItem[]>(trendingData || [])

  // 当数据加载完成后更新本地状态
  useState(() => {
    if (trendingData) {
      setArtworks(trendingData)
    }
  })

  const onLike = useCallback(async (id: string) => {
    setArtworks(prev => prev.map(a => a.id === id && !a.user_state.liked ? { 
      ...a, 
      like_count: a.like_count + 1, 
      user_state: { ...a.user_state, liked: true }
    } : a))
    try { await like(id) } catch {}
  }, [like])

  const onFavorite = useCallback(async (id: string) => {
    let nextIsFav: boolean | undefined
    setArtworks(prev => prev.map(a => {
      if (a.id !== id) return a
      nextIsFav = !a.user_state.faved
      return { 
        ...a, 
        fav_count: a.fav_count + (nextIsFav ? 1 : -1),
        user_state: { ...a.user_state, faved: nextIsFav }
      }
    }))
    try {
      if (nextIsFav) await addFavorite(id)
      else await removeFavorite(id)
    } catch {}
  }, [addFavorite, removeFavorite])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <div className="text-xl mb-2">加载失败</div>
        <div>请稍后重试</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg aspect-square mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!artworks || artworks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <div className="text-xl mb-2">暂无热门作品</div>
        <div>尝试调整时间范围或稍后再来</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ArtworkGrid 
        artworks={artworks} 
        onLike={onLike} 
        onFavorite={onFavorite} 
        showHotness
      />
    </div>
  )
}