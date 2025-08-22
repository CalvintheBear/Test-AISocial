'use client'

import { ArtworkListItem } from '@/lib/types'
import { ArtworkCard } from './ArtworkCard'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from './EmptyState'
import { Card, CardContent } from '@/components/ui/card'
import { AnimatedList, FadeInUp } from '@/components/ui/animated-container'

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
      <AnimatedList
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        animation="fade-in-up"
        staggerDelay={50}
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-0">
              <Skeleton className="aspect-square w-full rounded-none" />
              <div className="p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </AnimatedList>
    )
  }

  if (!artworks || artworks.length === 0) {
    return (
      <FadeInUp delay={100}>
        <EmptyState title="暂无作品" description="请稍后重试或调整筛选条件" />
      </FadeInUp>
    )
  }

  return (
    <AnimatedList
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      animation="fade-in-up"
      staggerDelay={100}
      delay={200}
    >
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
    </AnimatedList>
  )
}