export const DetailsSkeleton = () => {
  return (
    <div className="pb-10 animate-pulse">
      {/* Hero Section */}
      <div className="relative h-[40vh] md:h-[60vh] w-full bg-gray-800">
        <div className="absolute bottom-0 left-0 right-0 p-4 container mx-auto flex flex-col md:flex-row gap-6 items-end">
          <div className="hidden md:block w-48 h-72 rounded-lg bg-gray-700"></div>
          <div className="flex-1 mb-4 space-y-3">
            <div className="h-10 bg-gray-700 rounded w-2/3"></div>
            <div className="flex gap-4">
              <div className="h-5 bg-gray-700 rounded w-16"></div>
              <div className="h-5 bg-gray-700 rounded w-20"></div>
              <div className="h-5 bg-gray-700 rounded w-24"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        <div className="space-y-8">
          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="h-12 bg-gray-800 rounded-xl"></div>
            <div className="h-12 bg-gray-800 rounded-xl"></div>
            <div className="h-12 bg-gray-800 rounded-xl"></div>
          </div>

          {/* Overview */}
          <section className="space-y-3">
            <div className="h-6 bg-gray-800 rounded w-24"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-800 rounded"></div>
              <div className="h-4 bg-gray-800 rounded"></div>
              <div className="h-4 bg-gray-800 rounded w-5/6"></div>
            </div>
          </section>

          {/* Cast */}
          <section className="space-y-3">
            <div className="h-6 bg-gray-800 rounded w-20"></div>
            <div className="flex overflow-x-auto gap-4 pb-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-24">
                  <div className="w-24 h-24 rounded-full bg-gray-800 mb-2"></div>
                  <div className="h-3 bg-gray-800 rounded mb-1"></div>
                  <div className="h-2 bg-gray-800 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </section>

          {/* Sidebar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-64">
              <div className="h-6 bg-gray-800 rounded w-32 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-800 rounded"></div>
                <div className="h-4 bg-gray-800 rounded w-4/5"></div>
              </div>
            </div>
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 h-64">
              <div className="h-6 bg-gray-800 rounded w-40 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-800 rounded"></div>
                <div className="h-4 bg-gray-800 rounded"></div>
                <div className="h-4 bg-gray-800 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
