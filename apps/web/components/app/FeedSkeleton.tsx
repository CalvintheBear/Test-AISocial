import { Skeleton, SkeletonText, SkeletonRect } from '@/components/ui/skeleton'

export function FeedSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <SkeletonText className="h-8 w-48 mb-2" />
        <SkeletonText className="h-4 w-64" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="mb-6 flex gap-4">
        <SkeletonRect className="h-10 w-24 rounded-full" />
        <SkeletonRect className="h-10 w-24 rounded-full" />
        <SkeletonRect className="h-10 w-24 rounded-full" />
      </div>

      {/* Artwork grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="group relative overflow-hidden rounded-lg border bg-background p-4 space-y-3">
            {/* Image skeleton */}
            <SkeletonRect className="aspect-square w-full rounded-md" />
            
            {/* Title skeleton */}
            <SkeletonText className="h-5 w-3/4" />
            
            {/* Author skeleton */}
            <SkeletonText className="h-4 w-1/2" />
            
            {/* Stats skeleton */}
            <div className="flex items-center gap-4">
              <SkeletonText className="h-4 w-12" />
              <SkeletonText className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Compact feed skeleton for different layouts
export function CompactFeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-2">
          <SkeletonRect className="aspect-video w-full rounded-lg" />
          <SkeletonText className="h-4 w-3/4" />
          <SkeletonText className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}