import { Skeleton, SkeletonText, SkeletonRect, SkeletonCircle } from '@/components/ui/skeleton'

export function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile header skeleton */}
      <div className="mb-8 flex items-center gap-6">
        <SkeletonCircle className="w-24 h-24" />
        <div className="space-y-2">
          <SkeletonText className="h-8 w-48" />
          <SkeletonText className="h-4 w-64" />
          <SkeletonText className="h-4 w-32" />
        </div>
      </div>

      {/* Stats section skeleton */}
      <div className="mb-8 grid grid-cols-3 gap-4 max-w-md">
        <div className="text-center space-y-2">
          <SkeletonText className="h-6 w-12 mx-auto" />
          <SkeletonText className="h-4 w-16 mx-auto" />
        </div>
        <div className="text-center space-y-2">
          <SkeletonText className="h-6 w-12 mx-auto" />
          <SkeletonText className="h-4 w-16 mx-auto" />
        </div>
        <div className="text-center space-y-2">
          <SkeletonText className="h-6 w-12 mx-auto" />
          <SkeletonText className="h-4 w-16 mx-auto" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="mb-6 border-b">
        <div className="flex gap-8">
          <SkeletonText className="h-6 w-20" />
          <SkeletonText className="h-6 w-20" />
          <SkeletonText className="h-6 w-20" />
        </div>
      </div>

      {/* Artwork grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="group relative overflow-hidden rounded-lg border bg-background p-4 space-y-3">
            <SkeletonRect className="aspect-square w-full rounded-md" />
            <SkeletonText className="h-5 w-3/4" />
            <SkeletonText className="h-4 w-1/2" />
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

// Compact profile skeleton for sidebar
export function CompactProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <SkeletonCircle className="w-12 h-12" />
        <div className="space-y-1">
          <SkeletonText className="h-4 w-24" />
          <SkeletonText className="h-3 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="text-center">
          <SkeletonText className="h-4 w-8 mx-auto" />
          <SkeletonText className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center">
          <SkeletonText className="h-4 w-8 mx-auto" />
          <SkeletonText className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center">
          <SkeletonText className="h-4 w-8 mx-auto" />
          <SkeletonText className="h-3 w-12 mx-auto" />
        </div>
      </div>
    </div>
  )
}