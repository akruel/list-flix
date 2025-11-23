import { MovieCardSkeleton } from './MovieCardSkeleton';

interface ContentGridSkeletonProps {
  count?: number;
}

export const ContentGridSkeleton = ({ count = 10 }: ContentGridSkeletonProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  );
};
