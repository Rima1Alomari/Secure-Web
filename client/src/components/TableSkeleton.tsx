interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export default function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="card overflow-hidden animate-pulse">
      {/* Search Bar Skeleton */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
      </div>

      {/* Table Skeleton */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          {/* Header Skeleton */}
          <thead className="bg-gray-100 dark:bg-gray-700">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-6 py-4">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          {/* Body Skeleton */}
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Skeleton */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-40"></div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-20 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 w-9 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="h-9 w-20 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    </div>
  )
}


