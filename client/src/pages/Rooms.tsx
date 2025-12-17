import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPlus, FaUsers, FaLock, FaUnlock, FaClock } from 'react-icons/fa'
import Modal from '../components/common/Modal'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { ROOMS_KEY, CHAT_MESSAGES_KEY } from '../data/keys'
import { Room, ChatMessage } from '../types/models'
import { useUser } from '../contexts/UserContext'

const Rooms = () => {
  const navigate = useNavigate()
  const { role } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: '', description: '', isPrivate: false })
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // Get rooms with last message and unread count
  const rooms = useMemo(() => {
    const allRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    const allMessages = getJSON<ChatMessage[]>(CHAT_MESSAGES_KEY, []) || []
    
    return allRooms.map(room => {
      const roomMessages = allMessages
        .filter(msg => msg.roomId === room.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      const lastMessage = roomMessages[0]
      const unreadCount = roomMessages.filter(msg => !msg.isOwn && msg.read !== true).length
      
      return {
        ...room,
        lastMessage: lastMessage?.message || 'No messages yet',
        lastMessageTime: lastMessage?.timestamp || room.updatedAt,
        unreadCount: unreadCount || 0,
      }
    }).sort((a, b) => new Date(b.lastMessageTime || b.updatedAt).getTime() - new Date(a.lastMessageTime || a.updatedAt).getTime())
  }, [refreshKey])

  const handleCreateRoom = () => {
    if (!newRoom.name.trim()) {
      return
    }

    const room: Room = {
      id: uuid(),
      name: newRoom.name,
      description: newRoom.description,
      isPrivate: newRoom.isPrivate,
      members: 1,
      maxMembers: 50,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      roomLevel: 'Normal',
      memberIds: [],
    }

    const allRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    setJSON(ROOMS_KEY, [...allRooms, room])
    setNewRoom({ name: '', description: '', isPrivate: false })
    setShowCreateModal(false)
    setRefreshKey(prev => prev + 1)
  }

  const handleRoomClick = (roomId: string) => {
    navigate(`/rooms/${roomId}`)
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }


  if (isLoading) {
    return (
      <div className="page-content">
        <div className="page-container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card h-40 bg-gray-200 dark:bg-gray-600"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-container">
        <div className="flex justify-between items-center page-header">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="page-title">Rooms</h1>
            {role === 'admin' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary"
              >
                <FaPlus className="text-sm" /> Create Room
              </button>
            )}
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="card p-12 md:p-16">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 rounded-full mb-6">
                <FaUsers className="text-blue-600 dark:text-blue-400 text-4xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                No rooms yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                {role === 'admin' 
                  ? 'Create your first room to start collaborating with your team.'
                  : 'No rooms available. Contact an admin to create a room.'}
              </p>
              {role === 'admin' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary"
                >
                  Create Room
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleRoomClick(room.id)}
                className={`text-left card-hover p-6 transition-all duration-200 ${
                  room.unreadCount && room.unreadCount > 0
                    ? 'border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/10 ring-2 ring-blue-500/20'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                      {room.name}
                    </h3>
                    {room.unreadCount && room.unreadCount > 0 && (
                      <span className="flex-shrink-0 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                        {room.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <FaUsers />
                    <span>{room.members}/{room.maxMembers} members</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaClock />
                    <span>{formatTimeAgo(room.lastMessageTime || room.updatedAt)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Create Room Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setNewRoom({ name: '', description: '', isPrivate: false })
          }}
          title="Create New Room"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Room Name *
              </label>
              <input
                type="text"
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter room name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={newRoom.description}
                onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter room description"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="private"
                checked={newRoom.isPrivate}
                onChange={(e) => setNewRoom({ ...newRoom, isPrivate: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="private" className="text-sm text-gray-700 dark:text-gray-300">
                Private Room
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewRoom({ name: '', description: '', isPrivate: false })
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                className="btn-primary flex-1"
              >
                Create
              </button>
            </div>
          </div>
        </Modal>

      </div>
    </div>
  )
}

export default Rooms
