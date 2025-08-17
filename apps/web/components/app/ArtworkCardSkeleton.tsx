import { Skeleton, SkeletonText, SkeletonRect } from '@/components/ui/skeleton'

export function ArtworkCardSkeleton() {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-background p-4 space-y-3">
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
  )
}