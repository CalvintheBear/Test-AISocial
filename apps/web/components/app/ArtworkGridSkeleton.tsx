import { ArtworkCardSkeleton } from './ArtworkCardSkeleton'

interface ArtworkGridSkeletonProps {
  count?: number
  columns?: number
}

export function ArtworkGridSkeleton({ count = 12, columns = 4 }: ArtworkGridSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
      {Array.from({ length: count }).map((_, index) => (
        <ArtworkCardSkeleton key={index} />
      ))}
    </div>
  )
}

// Responsive grid skeleton
export function ResponsiveArtworkGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, index) => (
        <ArtworkCardSkeleton key={index} />
      ))}
    </div>
  )
}