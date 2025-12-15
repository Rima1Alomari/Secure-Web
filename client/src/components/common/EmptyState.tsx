import { ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  suggestedActions?: Array<{
    icon: ReactNode
    title: string
    description: string
    onClick: () => void
  }>
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  suggestedActions,
}: EmptyStateProps) {
  return (
    <div className="card p-12 md:p-16">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 rounded-full mb-6">
          {icon}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          {description}
        </p>
        {action && (
          <button
            onClick={action.onClick}
            className={action.variant === 'secondary' ? 'btn-secondary mx-auto' : 'btn-primary mx-auto'}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Suggested Actions */}
      {suggestedActions && suggestedActions.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
            Suggested Actions
          </h3>
          <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {suggestedActions.map((suggestion, index) => (
              <button
                key={index}
                onClick={suggestion.onClick}
                className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
              >
                <div className="text-blue-600 dark:text-blue-400 text-xl mb-2 group-hover:scale-110 transition-transform">
                  {suggestion.icon}
                </div>
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  {suggestion.title}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {suggestion.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


