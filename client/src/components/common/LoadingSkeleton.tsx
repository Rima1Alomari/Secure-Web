import { ReactNode } from 'react'

interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'list' | 'page'
  rows?: number
  columns?: number
  children?: ReactNode
}

export default function LoadingSkeleton({
  variant = 'card',
  rows = 3,
  columns = 3,
  children,
}: LoadingSkeletonProps) {
  if (children) {
    return <div className="animate-pulse">{children}</div>
  }

  switch (variant) {
    case 'card':
      return (
        <div className="card animate-pulse">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-4/6"></div>
            </div>
            <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      )

    case 'table':
      return (
        <div className="card overflow-hidden animate-pulse">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  {Array.from({ length: columns }).map((_, i) => (
                    <th key={i} className="px-6 py-4 border-b-2 border-gray-300 dark:border-gray-600">
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-200 dark:border-gray-700">
                    {Array.from({ length: columns }).map((_, colIndex) => (
                      <td key={colIndex} className="px-6 py-4 border-r border-gray-200 dark:border-gray-700">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-24"></div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

    case 'list':
      return (
        <div className="card animate-pulse">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-48 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )

    case 'page':
      return (
        <div className="animate-pulse">
          <div className="mb-8">
            <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded-lg w-64 mb-3"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded-lg w-48"></div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card">
                <div className="w-16 h-16 bg-gray-300 dark:bg-gray-700 rounded-xl mx-auto mb-4"></div>
                <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      )

    default:
      return null
  }
}


