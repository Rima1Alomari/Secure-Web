import { useState, useRef, useEffect } from 'react'
import { FaBell, FaShieldAlt, FaVideo, FaClock, FaFile, FaCheck } from 'react-icons/fa'

interface Notification {
  id: string
  message: string
  type: 'security' | 'room' | 'meeting' | 'file'
  timestamp: string
  read: boolean
}

// Mock notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    message: 'Security scan completed',
    type: 'security',
    timestamp: '2 minutes ago',
    read: false,
  },
  {
    id: '2',
    message: 'New room created: Development Team',
    type: 'room',
    timestamp: '15 minutes ago',
    read: false,
  },
  {
    id: '3',
    message: 'Meeting reminder in 15 min',
    type: 'meeting',
    timestamp: '1 hour ago',
    read: false,
  },
  {
    id: '4',
    message: 'File uploaded: Project_Report.pdf',
    type: 'file',
    timestamp: '3 hours ago',
    read: false,
  },
]

const typeConfig = {
  security: { icon: FaShieldAlt, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  room: { icon: FaVideo, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  meeting: { icon: FaClock, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  file: { icon: FaFile, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
}

export default function NotificationsCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const notificationRef = useRef<HTMLDivElement>(null)

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length

  // Mark all as read
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  // Mark single notification as read
  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={notificationRef} className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
        aria-label="Notifications"
      >
        <FaBell className="h-5 w-5 sm:h-6 sm:w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full border-2 border-white dark:border-gray-800">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200 flex items-center gap-1.5"
              >
                <FaCheck className="text-xs" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <FaBell className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No notifications
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => {
                  const config = typeConfig[notification.type]
                  const Icon = config.icon
                  
                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleMarkAsRead(notification.id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-150 ${
                        !notification.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                          <Icon className={`${config.color} text-base`} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            notification.read 
                              ? 'text-gray-600 dark:text-gray-400' 
                              : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {notification.timestamp}
                          </p>
                        </div>
                        
                        {/* Unread Indicator */}
                        {!notification.read && (
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full mt-2"></div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer (Optional - could add "View all" link) */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-center">
              <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-200">
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


