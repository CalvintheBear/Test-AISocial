'use client'

import { ArtworkListItem } from '@/lib/types'
import { ArtworkCard } from './ArtworkCard'

interface ArtworkGridProps {
  artworks: ArtworkListItem[]
  onLike?: (artworkId: string) => Promise<void>
  onFavorite?: (artworkId: string) => Promise<void>
  loading?: boolean
  showHotness?: boolean
  locked?: boolean
  onLockedClick?: () => void
}

export function ArtworkGrid({ artworks, onLike, onFavorite, loading, showHotness, locked, onLockedClick }: ArtworkGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="aspect-square bg-gray-200 rounded-lg" />
            <div className="mt-4 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!artworks || artworks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">暂无作品</div>
        <p className="text-gray-400 mt-2">请稍后重试或调整筛选条件</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {artworks.map((artwork) => (
        <ArtworkCard
          key={artwork.id}
          artwork={artwork}
          onLike={onLike}
          onFavorite={onFavorite}
          showHotness={showHotness}
          locked={locked}
          onLockedClick={onLockedClick}
        />
      ))}
    </div>
  )
}