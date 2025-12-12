import { useState } from 'react'
import { FaFile, FaVideo, FaUsers, FaClock, FaArrowRight, FaRobot, FaLightbulb } from 'react-icons/fa'

interface RecentItem {
  id: string
  type: 'file' | 'video' | 'room' | 'chat'
  name: string
  action: string
  timestamp: Date
}

const Recent = () => {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([
    {
      id: '1',
      type: 'file',
      name: 'Project_Report.pdf',
      action: 'Opened',
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: '2',
      type: 'video',
      name: 'Team Meeting',
      action: 'Joined',
      timestamp: new Date(Date.now() - 7200000)
    },
    {
      id: '3',
      type: 'room',
      name: 'Development Team',
      action: 'Entered',
      timestamp: new Date(Date.now() - 10800000)
    },
    {
      id: '4',
      type: 'file',
      name: 'Presentation.pptx',
      action: 'Edited',
      timestamp: new Date(Date.now() - 14400000)
    },
    {
      id: '5',
      type: 'chat',
      name: 'General Discussion',
      action: 'Messaged',
      timestamp: new Date(Date.now() - 18000000)
    }
  ])

  const getIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FaFile className="text-blue-600 dark:text-blue-400" />
      case 'video':
        return <FaVideo className="text-green-600 dark:text-green-400" />
      case 'room':
        return <FaUsers className="text-purple-600 dark:text-purple-400" />
      case 'chat':
        return <FaUsers className="text-orange-600 dark:text-orange-400" />
      default:
        return <FaFile />
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) {
      return `${minutes} minutes ago`
    } else if (hours < 24) {
      return `${hours} hours ago`
    } else {
      return `${days} days ago`
    }
  }

  const handleItemClick = (item: RecentItem) => {
    // Navigate based on type
    switch (item.type) {
      case 'file':
        window.location.href = '/files'
        break
      case 'video':
        window.location.href = `/video/${item.name}`
        break
      case 'room':
        window.location.href = '/rooms'
        break
      case 'chat':
        window.location.href = '/chat'
        break
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white mb-2">
              Recent
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
              View your recent activities
            </p>
        </div>

        {/* AI Features Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* AI Activity Insights */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FaRobot className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Activity Insights</h3>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Most Active Time</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">10:00 AM - 12:00 PM (Peak hours)</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Activity Trend</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">↑ 15% increase this week</p>
              </div>
            </div>
          </div>

          {/* AI Priority Suggestions */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <FaLightbulb className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Priority Suggestions</h3>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">High Priority</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Project_Report.pdf - Review needed</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Follow-up</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Team Meeting - Action items pending</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
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
                        <span>{item.action}</span>
                        <FaClock className="text-xs" />
                        <span>{formatTime(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  <FaArrowRight className="text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Recent

