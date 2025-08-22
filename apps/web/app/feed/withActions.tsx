'use client'

import { useState, useCallback, useEffect } from 'react'
import { ArtworkListItem } from '@/lib/types'
import { ArtworkGrid } from '@/components/app/ArtworkGrid'
import { useLike } from '@/hooks/useLike'
import { useFavorite } from '@/hooks/useFavorite'
import TrendingTab from '@/components/TrendingTab'
import { useFeed } from '@/hooks/useFeed'
import { FadeInUp, AnimatedContainer } from '@/components/ui/animated-container'

export default function ClientFeedActions({ initialArtworks }: { initialArtworks: ArtworkListItem[] }) {
  const [activeTab, setActiveTab] = useState<'feed' | 'trending'>('feed')
  const { artworks, isLoading, mutate } = useFeed(initialArtworks)
  const [clientArtworks, setClientArtworks] = useState<ArtworkListItem[]>(artworks || [])

  // 同步 SWR 返回的数据到本地可变列表，避免初次加载后仍显示空
  useEffect(() => {
    setClientArtworks(artworks || [])
  }, [artworks])
  const { like } = useLike()
  const { addFavorite, removeFavorite } = useFavorite()

  const onLike = useCallback(async (id: string) => {
    setClientArtworks(prev => prev.map(a => a.id === id && !a.user_state.liked ? { 
      ...a, 
      like_count: a.like_count + 1, 
      user_state: { ...a.user_state, liked: true }
    } : a))
    try { await like(id) } catch {}
  }, [like])

  const onFavorite = useCallback(async (id: string) => {
    let nextIsFav: boolean | undefined
    setClientArtworks(prev => prev.map(a => {
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

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <AnimatedContainer trigger="onMount" animation="fade-in-up" delay={100}>
          <div className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-2">发现作品</h1>
            <p className="text-muted-foreground text-lg">探索社区中令人惊叹的 AI 生成艺术作品，发现创意灵感</p>
          </div>
        </AnimatedContainer>
        
        {/* 标签切换 */}
        <AnimatedContainer trigger="onMount" animation="fade-in-up" delay={200}>
          <div className="mb-8 border-b">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('feed')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors btn-animate ${
                  activeTab === 'feed'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                最新作品
              </button>
              <button
                onClick={() => setActiveTab('trending')}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 btn-animate ${
                  activeTab === 'trending'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="text-orange-500">🔥</span> 热门作品
              </button>
            </nav>
          </div>
        </AnimatedContainer>

        {/* 内容区域 */}
        <AnimatedContainer trigger="onMount" animation="fade-in-up" delay={300}>
          {activeTab === 'feed' ? (
            <ArtworkGrid artworks={clientArtworks} onLike={onLike} onFavorite={onFavorite} loading={isLoading} />
          ) : (
            <div className="min-h-[50vh]">
              <TrendingTab />
            </div>
          )}
        </AnimatedContainer>
      </div>
    </div>
  )
}


