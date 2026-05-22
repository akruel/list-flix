import { Skeleton } from "@/components/ui/skeleton";

export function ActivityFeedSkeleton() {
  return (
    <div className="space-y-1">
      {/* Day header skeleton */}
      <Skeleton className="mb-3 h-4 w-16" />
      {Array.from({ length: 4 }).map((_, i) => (
        <ActivityCardSkeleton key={i} />
      ))}
      {/* Second day header */}
      <Skeleton className="mb-3 mt-6 h-4 w-20" />
      {Array.from({ length: 3 }).map((_, i) => (
        <ActivityCardSkeleton key={`b-${i}`} />
      ))}
    </div>
  );
}

function ActivityCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg p-3">
      {/* Avatar */}
      <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
      {/* Text lines */}
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      {/* Poster thumbnail */}
      <Skeleton className="h-[60px] w-10 flex-shrink-0 rounded" />
    </div>
  );
}
