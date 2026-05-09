export const ListSelectionModalSkeleton = () => {
  return (
    <div className="animate-pulse space-y-1 p-2">
      {/* Default List */}
      <div className="flex items-center justify-between rounded-xl p-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gray-800" />
          <div className="h-5 w-24 rounded bg-gray-800" />
        </div>
      </div>

      <div className="mx-3 my-2 h-px bg-gray-800" />

      {/* Custom Lists */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl p-3"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gray-800" />
            <div className="space-y-1">
              <div className="h-5 w-32 rounded bg-gray-800" />
              <div className="h-3 w-16 rounded bg-gray-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
