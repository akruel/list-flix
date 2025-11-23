export const EpisodeListSkeleton = () => {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="w-32 aspect-video bg-gray-800 rounded flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-800 rounded w-3/4"></div>
            <div className="h-3 bg-gray-800 rounded w-1/2"></div>
            <div className="h-3 bg-gray-800 rounded"></div>
            <div className="h-3 bg-gray-800 rounded w-5/6"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
