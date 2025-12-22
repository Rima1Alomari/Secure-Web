import { useState, useRef, useEffect } from 'react'
import { FaBell, FaShieldAlt, FaVideo, FaClock, FaFile, FaCheck, FaComments } from 'react-icons/fa'
import { useUser } from '../contexts/UserContext'
import { getJSON, setJSON } from '../data/storage'
import { NOTIFICATIONS_KEY } from '../data/keys'
import { subscribeToNotifications, createNotification, markNotificationAsRead as markNotificationRead } from '../services/firestore'

interface Notification {
  id: string
  message: string
  type: 'security' | 'room' | 'meeting' | 'file' | 'message'
  timestamp: string | Date
  read: boolean
  userId?: string
  link?: string
}

const typeConfig = {
  security: { icon: FaShieldAlt, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  room: { icon: FaVideo, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  meeting: { icon: FaClock, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  file: { icon: FaFile, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  message: { icon: FaComments, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
}

export default function NotificationsCenter() {
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const notificationRef = useRef<HTMLDivElement>(null)

  // Load notifications from localStorage and subscribe to Firestore
  useEffect(() => {
    if (!user?.id) return

    // Load from localStorage as fallback
    const localNotifications = getJSON<Notification[]>(NOTIFICATIONS_KEY, []) || []
    const userNotifications = localNotifications.filter(n => !n.userId || n.userId === user.id)
    setNotifications(userNotifications)

    // Subscribe to real-time notifications from Firestore
    try {
      const unsubscribe = subscribeToNotifications(user.id, (firestoreNotifications) => {
        const mappedNotifications: Notification[] = firestoreNotifications.map((n: any) => ({
          id: n.id,
          message: n.message,
          type: n.type || 'message',
          timestamp: n.timestamp instanceof Date ? n.timestamp : new Date(n.timestamp),
          read: n.read || false,
          userId: n.userId,
          link: n.link
        }))
        setNotifications(mappedNotifications)
        // Also save to localStorage
        setJSON(NOTIFICATIONS_KEY, mappedNotifications)
      })

      return () => unsubscribe()
    } catch (error) {
      console.error('Error subscribing to notifications:', error)
      // Continue with localStorage only
    }
  }, [user?.id])

  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length

  // Format timestamp
  const formatTimestamp = (timestamp: string | Date): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    
    // Update in Firestore
    try {
      await Promise.all(unreadNotifications.map(n => markNotificationRead(n.id)))
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
    
    // Update localStorage
    const updated = notifications.map(n => ({ ...n, read: true }))
    setJSON(NOTIFICATIONS_KEY, updated)
  }

  // Mark single notification as read
  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    
    // Update in Firestore
    try {
      await markNotificationRead(id)
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
    
    // Update localStorage
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n)
    setJSON(NOTIFICATIONS_KEY, updated)
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
                            {formatTimestamp(notification.timestamp)}
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


