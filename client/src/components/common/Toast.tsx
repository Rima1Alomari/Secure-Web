import { useEffect } from 'react'
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

const typeConfig = {
  success: {
    icon: FaCheckCircle,
    bgColor: 'bg-green-500/20 dark:bg-green-900/20',
    borderColor: 'border-green-500 dark:border-green-400',
    textColor: 'text-green-300 dark:text-green-400',
    iconColor: 'text-green-500 dark:text-green-400',
  },
  error: {
    icon: FaExclamationTriangle,
    bgColor: 'bg-red-500/20 dark:bg-red-900/20',
    borderColor: 'border-red-500 dark:border-red-400',
    textColor: 'text-red-300 dark:text-red-400',
    iconColor: 'text-red-500 dark:text-red-400',
  },
  info: {
    icon: FaInfoCircle,
    bgColor: 'bg-blue-500/20 dark:bg-blue-900/20',
    borderColor: 'border-blue-500 dark:border-blue-400',
    textColor: 'text-blue-300 dark:text-blue-400',
    iconColor: 'text-blue-500 dark:text-blue-400',
  },
  warning: {
    icon: FaExclamationTriangle,
    bgColor: 'bg-yellow-500/20 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-500 dark:border-yellow-400',
    textColor: 'text-yellow-300 dark:text-yellow-400',
    iconColor: 'text-yellow-500 dark:text-yellow-400',
  },
}

export default function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <div
      className={`fixed top-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-50 border-2 ${config.bgColor} ${config.borderColor} ${config.textColor} animate-fade-in flex items-center gap-3 min-w-[300px] max-w-md`}
    >
      <Icon className={`${config.iconColor} text-xl flex-shrink-0`} />
      <p className="flex-1 font-semibold">{message}</p>
      <button
        onClick={onClose}
        className={`${config.textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
        aria-label="Close toast"
      >
        <FaTimes />
      </button>
    </div>
  )
}


