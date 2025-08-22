import { Skeleton } from '@/components/ui/skeleton'

export function ArtworkCardSkeleton() {
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-background p-4 space-y-3">
      {/* Image skeleton */}
      <Skeleton className="aspect-square w-full rounded-md" />
      
      {/* Title skeleton */}
      <Skeleton className="h-5 w-3/4" />
      
      {/* Author skeleton */}
      <Skeleton className="h-4 w-1/2" />
      
      {/* Stats skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  )
}