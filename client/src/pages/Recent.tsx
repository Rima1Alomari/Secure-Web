import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaFile, FaUsers, FaCalendarAlt, FaClock, FaArrowRight } from 'react-icons/fa'
import { getJSON } from '../data/storage'
import { RECENT_OPENED_KEY, FILES_KEY, ROOMS_KEY, EVENTS_KEY } from '../data/keys'
import { RecentActivity, FileItem, Room, EventItem } from '../types/models'
import { useUser } from '../contexts/UserContext'

const Recent = () => {
  const navigate = useNavigate()
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [recentItems, setRecentItems] = useState<RecentActivity[]>([])

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // Load recent opened items
  useEffect(() => {
    const allOpened = getJSON<RecentActivity[]>(RECENT_OPENED_KEY, []) || []
    // Filter by current user
    const userOpened = allOpened.filter(item => item.userId === user?.id)
    // Sort by timestamp (most recent first)
    const sorted = userOpened.sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime()
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime()
      return timeB - timeA
    })
    setRecentItems(sorted)
  }, [user?.id])

  // Get item details (name) from their respective storage
  const itemsWithDetails = useMemo(() => {
    const allFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
    const allRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    const allEvents = getJSON<EventItem[]>(EVENTS_KEY, []) || []

    return recentItems.map(item => {
      let name = item.name
      
      if (item.type === 'file') {
        const file = allFiles.find(f => f.id === item.itemId)
        if (file) name = file.name
      } else if (item.type === 'room') {
        const room = allRooms.find(r => r.id === item.itemId)
        if (room) name = room.name
      } else if (item.type === 'meeting') {
        const event = allEvents.find(e => e.id === item.itemId)
        if (event) name = event.title
      }

      return { ...item, name }
    })
  }, [recentItems])

  const getIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FaFile className="text-blue-600 dark:text-blue-400" />
      case 'room':
        return <FaUsers className="text-purple-600 dark:text-purple-400" />
      case 'meeting':
        return <FaCalendarAlt className="text-green-600 dark:text-green-400" />
      default:
        return <FaFile />
    }
  }

  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minutes ago`
    if (hours < 24) return `${hours} hours ago`
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  const handleItemClick = (item: RecentActivity) => {
    switch (item.type) {
      case 'file':
        navigate('/files')
        break
      case 'room':
        navigate(`/rooms/${item.itemId}`)
        break
      case 'meeting':
        navigate('/calendar', { state: { focusEventId: item.itemId } })
        break
    }
  }


  if (isLoading) {
    return (
      <div className="page-content">
        <div className="page-container">
          <div className="card">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-6 animate-pulse">
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
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-container">
        <div className="page-header">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="page-title">Recent</h1>
          </div>
        </div>

        {itemsWithDetails.length === 0 ? (
          <div className="card p-12 md:p-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 rounded-full mb-6">
                <FaClock className="text-blue-600 dark:text-blue-400 text-4xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                No recent activity
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Open files, enter rooms, or view meetings to see them here.
              </p>
            </div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {itemsWithDetails.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className="w-full text-left p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        {getIcon(item.type)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <span className="capitalize">{item.type}</span>
                          <span>•</span>
                          <FaClock className="text-xs" />
                          <span>{formatTime(item.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    <FaArrowRight className="text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default Recent
