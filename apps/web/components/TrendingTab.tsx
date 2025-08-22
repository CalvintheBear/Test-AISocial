'use client'

import { ArtworkGrid } from '@/components/app/ArtworkGrid'
import { ArtworkListItem } from '@/lib/types'
import { useLike } from '@/hooks/useLike'
import { useFavorite } from '@/hooks/useFavorite'
import { useState, useCallback, useEffect } from 'react'
import { useTrendingArtworks } from '@/hooks/useArtworks'
import { FadeInUp, AnimatedContainer } from '@/components/ui/animated-container'

interface TrendingTabProps {
  timeWindow?: '24h' | '7d' | '30d'
}

export default function TrendingTab({ timeWindow = '24h' }: TrendingTabProps) {
  const { data: trendingData, error, isLoading } = useTrendingArtworks(timeWindow, 'all')

  const { like } = useLike()
  const { addFavorite, removeFavorite } = useFavorite()
  const [artworks, setArtworks] = useState<ArtworkListItem[]>(trendingData || [])

  // 当数据加载完成后更新本地状态
  useEffect(() => {
    if (trendingData) {
      setArtworks(trendingData)
    }
  }, [trendingData])

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
      <FadeInUp delay={100}>
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <div className="text-xl mb-2">加载失败</div>
          <div>请稍后重试</div>
        </div>
      </FadeInUp>
    )
  }

  if (isLoading) {
    return (
      <AnimatedContainer trigger="onMount" animation="fade-in-up" delay={100}>
        <div className="container mx-auto px-4 py-8">
          <ArtworkGrid artworks={[]} loading showHotness />
        </div>
      </AnimatedContainer>
    )
  }

  if (!artworks || artworks.length === 0) {
    return (
      <FadeInUp delay={100}>
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <div className="text-xl mb-2">暂无热门作品</div>
          <div>尝试调整时间范围或稍后再来</div>
        </div>
      </FadeInUp>
    )
  }

  return (
    <AnimatedContainer trigger="onMount" animation="fade-in-up" delay={100}>
      <div className="container mx-auto px-4 py-8">
        <ArtworkGrid 
          artworks={artworks} 
          onLike={onLike} 
          onFavorite={onFavorite} 
          showHotness
        />
      </div>
    </AnimatedContainer>
  )
}