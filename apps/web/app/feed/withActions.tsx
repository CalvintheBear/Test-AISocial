'use client'

import { useState, useCallback } from 'react'
import { ArtworkListItem } from '@/lib/types'
import { ArtworkGrid } from '@/components/app/ArtworkGrid'
import { useLike } from '@/hooks/useLike'
import { useFavorite } from '@/hooks/useFavorite'

export default function ClientFeedActions({ initialArtworks }: { initialArtworks: ArtworkListItem[] }) {
  const [artworks, setArtworks] = useState<ArtworkListItem[]>(initialArtworks || [])
  const { like } = useLike()
  const { addFavorite, removeFavorite } = useFavorite()

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">发现作品</h1>
        <p className="text-gray-600">探索社区中令人惊叹的 AI 生成艺术作品，发现创意灵感</p>
      </div>
      <ArtworkGrid artworks={artworks} onLike={onLike} onFavorite={onFavorite} />
    </div>
  )
}


