import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { 
  FaUsers, 
  FaCalendarAlt, 
  FaFile, 
  FaChevronRight,
  FaPlus,
  FaUpload,
  FaDownload,
  FaCircle,
  FaChevronDown,
  FaChevronUp,
  FaRobot
} from 'react-icons/fa'
import axios from 'axios'
import { getToken } from '../utils/auth'
import { Modal, Toast } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { ROOMS_KEY, EVENTS_KEY, FILES_KEY, CHAT_MESSAGES_KEY } from '../data/keys'
import { Room, EventItem, FileItem, ChatMessage } from '../types/models'
import { useUser } from '../contexts/UserContext'

const Dashboard = () => {
  const navigate = useNavigate()
  const { role } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  
  // Modal states
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  const [showNewEventModal, setShowNewEventModal] = useState(false)
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null)
  
  // Form states
  const [newRoom, setNewRoom] = useState({ name: '', description: '', isPrivate: false })
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', time: '', location: '' })
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  

  useEffect(() => {
    // Simulate loading for 600ms
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // State to trigger refresh
  const [refreshKey, setRefreshKey] = useState(0)

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

  // Get upcoming meetings (next 3-5)
  const upcomingMeetings = useMemo(() => {
    const allEvents = getJSON<EventItem[]>(EVENTS_KEY, []) || []
    const now = new Date()
    
    return allEvents
      .filter(e => {
        const eventDate = new Date(e.date)
        return eventDate >= now
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5) // Show next 3-5 meetings (max 5)
  }, [refreshKey])

  // Get shared files (files shared with current user or rooms user is in)
  const sharedFiles = useMemo(() => {
    const allFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
    const userRooms = rooms.map(r => r.id)
    
    return allFiles
      .filter(file => {
        // File is shared with user or with a room the user is in
        return file.sharedWith && file.sharedWith.length > 0 && 
               (file.sharedWith.includes('current-user') || 
                file.sharedWith.some(roomId => userRooms.includes(roomId)))
      })
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
  }, [rooms, refreshKey])

  const handleCreateRoom = () => {
    if (!newRoom.name.trim()) {
      setToast({ message: 'Please enter a room name', type: 'error' })
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
    }

    const allRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    setJSON(ROOMS_KEY, [...allRooms, room])
    
    setToast({ message: 'Room created', type: 'success' })
    setShowCreateRoomModal(false)
    setNewRoom({ name: '', description: '', isPrivate: false })
    setRefreshKey(prev => prev + 1) // Refresh data
  }

  const handleUploadFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = false
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const fileItem: FileItem = {
        id: uuid(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: nowISO(),
        owner: 'Current User',
      }

      const allFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
      setJSON(FILES_KEY, [...allFiles, fileItem])
      
      setToast({ message: `File "${file.name}" uploaded`, type: 'success' })
      setRefreshKey(prev => prev + 1) // Refresh data
    }
    input.click()
  }

  const handleCreateEvent = () => {
    if (!newEvent.title.trim() || !newEvent.date || !newEvent.time) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    const event: EventItem = {
      id: uuid(),
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date,
      time: newEvent.time,
      location: newEvent.location,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }

    const allEvents = getJSON<EventItem[]>(EVENTS_KEY, []) || []
    setJSON(EVENTS_KEY, [...allEvents, event])
    
    setToast({ message: 'Event created', type: 'success' })
    setShowNewEventModal(false)
    setNewEvent({ title: '', description: '', date: '', time: '', location: '' })
    setRefreshKey(prev => prev + 1) // Refresh data
  }

  const handleMeetingClick = (event: EventItem) => {
    // Navigate to Calendar and focus the event
    navigate('/calendar', { state: { focusEventId: event.id } })
  }

  const handleRoomClick = (roomId: string) => {
    navigate(`/rooms/${roomId}`)
  }

  const handleDownloadFile = async (file: FileItem) => {
    try {
      // Check if file has backend ID (uploaded via API)
      const fileId = (file as any)._backendId || file.id
      
      // If it's a backend file, use API download
      if ((file as any)._backendId) {
        const API_URL = import.meta.env.VITE_API_URL || '/api'
        const axios = (await import('axios')).default
        const { getToken } = await import('../utils/auth')
        const token = getToken() || 'mock-token-for-testing'
        
        const response = await axios.get(
          `${API_URL}/files/${fileId}/download-url`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        const { downloadUrl } = response.data
        
        // Open download URL
        if (downloadUrl) {
          window.open(downloadUrl, '_blank')
          setToast({ message: `Downloading "${file.name}"`, type: 'info' })
        } else {
          // If it's a local file, try direct download
          const directResponse = await axios.get(
            `${API_URL}/files/${fileId}/download-url`,
            {
              headers: { Authorization: `Bearer ${token}` },
              responseType: 'blob'
            }
          )
          const url = window.URL.createObjectURL(new Blob([directResponse.data]))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', file.name)
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.URL.revokeObjectURL(url)
          setToast({ message: `Downloading "${file.name}"`, type: 'info' })
        }
      } else {
        // For localStorage files, show info
        setToast({ message: `File "${file.name}" is stored locally. Use the Files page to download.`, type: 'info' })
      }
    } catch (error: any) {
      console.error('Error downloading file:', error)
      setToast({ 
        message: error.response?.data?.error || 'Failed to download file', 
        type: 'error' 
      })
    }
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }


  const getAdminLabelColor = (label?: string) => {
    switch (label) {
      case 'Important': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      case 'Action': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
      case 'Plan': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      case 'FYI': return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
    }
  }

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="page-container">
          <div className="space-y-8 animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded-lg w-48"></div>
            <div className="card space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
              ))}
            </div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded-lg w-48"></div>
            <div className="card space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
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
        {/* Page Header */}
        <div className="page-header">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="page-title">Dashboard</h1>
          </div>
        </div>

        {/* Admin-only Quick Actions */}
        {role === 'admin' && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowCreateRoomModal(true)}
                className="btn-primary"
              >
                <FaPlus /> Create Room
              </button>
              <button
                onClick={handleUploadFile}
                className="btn-primary"
              >
                <FaUpload /> Upload File
              </button>
              <button
                onClick={() => setShowNewEventModal(true)}
                className="btn-primary"
              >
                <FaCalendarAlt /> Add Meeting
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* My Rooms Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Rooms</h2>
              <button
                onClick={() => navigate('/rooms')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all <FaChevronRight className="text-xs" />
              </button>
            </div>
            
            {rooms.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FaUsers className="text-4xl mx-auto mb-3 opacity-50" />
                <p>No rooms yet</p>
                {role === 'admin' && (
                  <button
                    onClick={() => setShowCreateRoomModal(true)}
                    className="btn-primary mt-4"
                  >
                    Create Room
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomClick(room.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                      room.unreadCount && room.unreadCount > 0
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {room.name}
                          </h3>
                          {room.unreadCount && room.unreadCount > 0 && (
                            <span className="flex-shrink-0 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                              {room.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mb-1">
                          {room.lastMessage}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {formatTimeAgo(room.lastMessageTime || room.updatedAt)}
                        </p>
                      </div>
                      <FaChevronRight className="text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Meetings Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upcoming Meetings</h2>
              <button
                onClick={() => navigate('/calendar')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all <FaChevronRight className="text-xs" />
              </button>
            </div>
            
            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FaCalendarAlt className="text-4xl mx-auto mb-3 opacity-50" />
                <p>No upcoming meetings</p>
                {role === 'admin' && (
                  <button
                    onClick={() => setShowNewEventModal(true)}
                    className="btn-primary mt-4"
                  >
                    Add Meeting
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    onClick={() => handleMeetingClick(meeting)}
                    className="w-full text-left p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-800 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                          {meeting.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <FaCalendarAlt className="text-xs" />
                          <span>{new Date(meeting.date).toLocaleDateString()}</span>
                          <span className="mx-1">•</span>
                          <span>{meeting.time}</span>
                        </div>
                        {meeting.location && (
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            📍 {meeting.location}
                          </p>
                        )}
                      </div>
                      <FaChevronRight className="text-gray-400 flex-shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Shared Files for Me Section */}
        <div className="card mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shared Files for Me</h2>
            <button
              onClick={() => navigate('/files')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View all <FaChevronRight className="text-xs" />
            </button>
          </div>
          
          {sharedFiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FaFile className="text-4xl mx-auto mb-3 opacity-50" />
              <p>No shared files</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sharedFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <FaFile className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                          {file.name}
                        </h3>
                        {file.adminLabel && (
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getAdminLabelColor(file.adminLabel)}`}>
                            {file.adminLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500 mb-2">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>by {file.owner}</span>
                      </div>
                      {expandedFileId === file.id && (file.adminNote || file.description) && (
                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {file.adminNote && (
                              <>
                                <strong>Admin Note:</strong> {file.adminNote}
                              </>
                            )}
                            {file.description && !file.adminNote && (
                              <>
                                <strong>Description:</strong> {file.description}
                              </>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(file.adminNote || file.description) && (
                        <button
                          onClick={() => setExpandedFileId(expandedFileId === file.id ? null : file.id)}
                          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                          title={expandedFileId === file.id ? 'Hide note' : 'Show admin note / description'}
                        >
                          {expandedFileId === file.id ? (
                            <FaChevronUp />
                          ) : (
                            <FaChevronDown />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="btn-secondary px-3 py-1.5 text-sm"
                        title="Download file"
                      >
                        <FaDownload />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Room Modal */}
        <Modal
          isOpen={showCreateRoomModal}
          onClose={() => {
            setShowCreateRoomModal(false)
            setNewRoom({ name: '', description: '', isPrivate: false })
          }}
          title="Create Room"
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
                id="private-room"
                checked={newRoom.isPrivate}
                onChange={(e) => setNewRoom({ ...newRoom, isPrivate: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="private-room" className="text-sm text-gray-700 dark:text-gray-300">
                Private Room
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowCreateRoomModal(false)
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
                Create Room
              </button>
            </div>
          </div>
        </Modal>

        {/* New Event Modal */}
        <Modal
          isOpen={showNewEventModal}
          onClose={() => {
            setShowNewEventModal(false)
            setNewEvent({ title: '', description: '', date: '', time: '', location: '' })
          }}
          title="Create Event"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter event title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter event description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter location (optional)"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowNewEventModal(false)
                  setNewEvent({ title: '', description: '', date: '', time: '', location: '' })
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="btn-primary flex-1"
              >
                Create Event
              </button>
            </div>
          </div>
        </Modal>

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  )
}

export default Dashboard
