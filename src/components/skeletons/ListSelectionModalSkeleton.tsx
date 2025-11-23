export const ListSelectionModalSkeleton = () => {
  return (
    <div className="space-y-1 p-2 animate-pulse">
      {/* Default List */}
      <div className="flex items-center justify-between p-3 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-800 rounded-lg"></div>
          <div className="h-5 bg-gray-800 rounded w-24"></div>
        </div>
      </div>

      <div className="h-px bg-gray-800 my-2 mx-3"></div>

      {/* Custom Lists */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-800 rounded-lg"></div>
            <div className="space-y-1">
              <div className="h-5 bg-gray-800 rounded w-32"></div>
              <div className="h-3 bg-gray-800 rounded w-16"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
