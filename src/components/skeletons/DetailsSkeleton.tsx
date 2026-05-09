export const DetailsSkeleton = () => {
  return (
    <div className="animate-pulse pb-10">
      {/* Hero Section */}
      <div className="relative h-[40vh] w-full bg-gray-800 md:h-[60vh]">
        <div className="container absolute bottom-0 left-0 right-0 mx-auto flex flex-col items-end gap-6 p-4 md:flex-row">
          <div className="hidden h-72 w-48 rounded-lg bg-gray-700 md:block" />
          <div className="mb-4 flex-1 space-y-3">
            <div className="h-10 w-2/3 rounded bg-gray-700" />
            <div className="flex gap-4">
              <div className="h-5 w-16 rounded bg-gray-700" />
              <div className="h-5 w-20 rounded bg-gray-700" />
              <div className="h-5 w-24 rounded bg-gray-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto mt-8 px-4">
        <div className="space-y-8">
          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="h-12 rounded-xl bg-gray-800" />
            <div className="h-12 rounded-xl bg-gray-800" />
            <div className="h-12 rounded-xl bg-gray-800" />
          </div>

          {/* Overview */}
          <section className="space-y-3">
            <div className="h-6 w-24 rounded bg-gray-800" />
            <div className="space-y-2">
              <div className="h-4 rounded bg-gray-800" />
              <div className="h-4 rounded bg-gray-800" />
              <div className="h-4 w-5/6 rounded bg-gray-800" />
            </div>
          </section>

          {/* Cast */}
          <section className="space-y-3">
            <div className="h-6 w-20 rounded bg-gray-800" />
            <div className="flex gap-4 overflow-x-auto pb-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="w-24 flex-shrink-0">
                  <div className="mb-2 h-24 w-24 rounded-full bg-gray-800" />
                  <div className="mb-1 h-3 rounded bg-gray-800" />
                  <div className="h-2 w-3/4 rounded bg-gray-800" />
                </div>
              ))}
            </div>
          </section>

          {/* Sidebar Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="h-64 rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-4 h-6 w-32 rounded bg-gray-800" />
              <div className="space-y-3">
                <div className="h-4 rounded bg-gray-800" />
                <div className="h-4 w-4/5 rounded bg-gray-800" />
              </div>
            </div>
            <div className="h-64 rounded-xl border border-gray-800 bg-gray-900 p-6">
              <div className="mb-4 h-6 w-40 rounded bg-gray-800" />
              <div className="space-y-3">
                <div className="h-4 rounded bg-gray-800" />
                <div className="h-4 rounded bg-gray-800" />
                <div className="h-4 w-3/4 rounded bg-gray-800" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
