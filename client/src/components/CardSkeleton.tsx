export default function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="space-y-4">
        {/* Icon/Header Skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
          </div>
        </div>
        
        {/* Content Skeleton */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-4/6"></div>
        </div>
        
        {/* Button Skeleton */}
        <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
      </div>
    </div>
  )
}


