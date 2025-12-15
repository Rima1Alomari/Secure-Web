export default function PageSkeleton() {
  return (
    <div className="page-content">
      <div className="page-container">
        {/* Header Skeleton */}
        <div className="page-header animate-pulse">
          <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded-lg w-64 mb-3"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded-lg w-48"></div>
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gray-300 dark:bg-gray-700 rounded-xl mx-auto"></div>
                <div className="space-y-2">
                  <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-5/6 mx-auto"></div>
                </div>
                <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


