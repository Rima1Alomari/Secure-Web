import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  FaPaperPlane, 
  FaUser, 
  FaUpload, 
  FaCalendarAlt, 
  FaUsers, 
  FaEdit, 
  FaTrash, 
  FaCog,
  FaLock,
  FaDownload,
  FaFile
} from 'react-icons/fa'
import { Modal, Toast, ConfirmDialog } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { ROOMS_KEY, CHAT_MESSAGES_KEY, FILES_KEY, EVENTS_KEY } from '../data/keys'
import { Room, ChatMessage, FileItem, EventItem } from '../types/models'
import { useUser } from '../contexts/UserContext'
import { trackRoomOpened } from '../utils/recentTracker'

type Tab = 'chat' | 'files' | 'meetings'

const RoomDetails = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { role, user } = useUser()
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [room, setRoom] = useState<Room | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Files state
  const [roomFiles, setRoomFiles] = useState<FileItem[]>([])
  
  // Meetings state
  const [roomMeetings, setRoomMeetings] = useState<EventItem[]>([])
  
  // Admin modals
  const [showManageMembersModal, setShowManageMembersModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  
  // Form states
  const [newRoomName, setNewRoomName] = useState('')
  const [roomLevel, setRoomLevel] = useState<'Normal' | 'Confidential'>('Normal')
  const [memberIds, setMemberIds] = useState<string[]>([])
  
  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)

  useEffect(() => {
    if (!id) {
      navigate('/rooms')
      return
    }

    const allRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    const foundRoom = allRooms.find(r => r.id === id)
    
    if (!foundRoom) {
      setToast({ message: 'Room not found', type: 'error' })
      navigate('/rooms')
      return
    }

    setRoom(foundRoom)
    setNewRoomName(foundRoom.name)
    setRoomLevel(foundRoom.roomLevel || 'Normal')
    setMemberIds(foundRoom.memberIds || [])
    
    // Track room opened
    if (user?.id) {
      trackRoomOpened(foundRoom.id, foundRoom.name, user.id)
    }
    
    // Load messages for this room
    const allMessages = getJSON<ChatMessage[]>(CHAT_MESSAGES_KEY, []) || []
    const roomMessages = allMessages
      .filter(msg => msg.roomId === id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    setMessages(roomMessages)
    
    // Load files for this room
    const allFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
    const files = allFiles.filter(file => 
      file.sharedWith && file.sharedWith.includes(id)
    )
    setRoomFiles(files)
    
    // Load meetings for this room (events with roomId in description or metadata)
    const allEvents = getJSON<EventItem[]>(EVENTS_KEY, []) || []
    const meetings = allEvents.filter(event => 
      event.description?.includes(`Room: ${id}`) || 
      (event as any).roomId === id
    )
    setRoomMeetings(meetings)
    
    setIsLoading(false)
  }, [id, navigate])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (!newMessage.trim() || !id) return

    const message: ChatMessage = {
      id: uuid(),
      sender: user?.name || 'You',
      senderId: user?.id,
      message: newMessage,
      timestamp: nowISO(),
      isOwn: true,
      roomId: id,
      read: false,
    }

    const allMessages = getJSON<ChatMessage[]>(CHAT_MESSAGES_KEY, []) || []
    setJSON(CHAT_MESSAGES_KEY, [...allMessages, message])
    setMessages([...messages, message])
    setNewMessage('')
    
    // Update room's last message
    if (room) {
      const allRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
      const updatedRooms = allRooms.map(r => 
        r.id === id 
          ? { ...r, lastMessage: newMessage, lastMessageTime: nowISO(), updatedAt: nowISO() }
          : r
      )
      setJSON(ROOMS_KEY, updatedRooms)
      setRoom(updatedRooms.find(r => r.id === id) || null)
    }
  }

  const handleUploadFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = false
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !id) return

      const fileItem: FileItem = {
        id: uuid(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: nowISO(),
        owner: user?.name || 'Current User',
        ownerId: user?.id,
        sharedWith: [id], // Share with this room
      }

      const allFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
      setJSON(FILES_KEY, [...allFiles, fileItem])
      setRoomFiles([...roomFiles, fileItem])
      setToast({ message: `File "${file.name}" uploaded to room`, type: 'success' })
    }
    input.click()
  }

  const handleScheduleMeeting = () => {
    navigate('/calendar', { state: { roomId: id } })
  }

  const handleRenameRoom = () => {
    if (!newRoomName.trim() || !id) return

    const allRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    const updatedRooms = allRooms.map(r => 
      r.id === id 
        ? { ...r, name: newRoomName, updatedAt: nowISO() }
        : r
    )
    setJSON(ROOMS_KEY, updatedRooms)
    setRoom(updatedRooms.find(r => r.id === id) || null)
    setShowRenameModal(false)
    setToast({ message: 'Room renamed', type: 'success' })
  }

  const handleDeleteRoom = () => {
    if (!id) return

    const allRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    const updatedRooms = allRooms.filter(r => r.id !== id)
    setJSON(ROOMS_KEY, updatedRooms)
    setToast({ message: 'Room deleted', type: 'success' })
    navigate('/rooms')
  }

  const handleUpdateSettings = () => {
    if (!id) return

    const allRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    const updatedRooms = allRooms.map(r => 
      r.id === id 
        ? { ...r, roomLevel, memberIds, updatedAt: nowISO() }
        : r
    )
    setJSON(ROOMS_KEY, updatedRooms)
    setRoom(updatedRooms.find(r => r.id === id) || null)
    setShowSettingsModal(false)
    setToast({ message: 'Room settings updated', type: 'success' })
  }

  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="page-container">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded-lg w-64"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!room) {
    return null
  }

  const isAdmin = role === 'admin'

  return (
    <div className="page-content">
      <div className="page-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/rooms')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2"
            >
              ← Back to Rooms
            </button>
            <h1 className="page-title">{room.name}</h1>
            <p className="page-subtitle">{room.description}</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="btn-secondary"
                title="Room Settings"
              >
                <FaCog />
              </button>
              <button
                onClick={() => setShowRenameModal(true)}
                className="btn-secondary"
                title="Rename Room"
              >
                <FaEdit />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-danger"
                title="Delete Room"
              >
                <FaTrash />
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'chat'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'files'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Files
          </button>
          <button
            onClick={() => setActiveTab('meetings')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'meetings'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Meetings/Schedule
          </button>
        </div>

        {/* Tab Content */}
        <div className="card">
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex flex-col" style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <FaUser className="text-4xl mb-3 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.isOwn ? 'flex-row-reverse' : ''}`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                        <FaUser className="text-white text-sm" />
                      </div>
                      <div className={`flex-1 ${msg.isOwn ? 'text-right' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900 dark:text-white">{msg.sender}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(msg.timestamp)}</span>
                        </div>
                        <div
                          className={`inline-block px-5 py-3 rounded-xl shadow-lg ${
                            msg.isOwn
                              ? 'bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-500 dark:to-green-500 text-white'
                              : 'bg-white dark:bg-gray-700 border-2 border-blue-200/50 dark:border-blue-800/50 text-gray-900 dark:text-white'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="btn-primary px-6"
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Files</h2>
                <button
                  onClick={handleUploadFile}
                  className="btn-primary"
                >
                  <FaUpload /> Upload File
                </button>
              </div>
              {roomFiles.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FaFile className="text-4xl mx-auto mb-3 opacity-50" />
                  <p>No files in this room yet</p>
                  <button
                    onClick={handleUploadFile}
                    className="btn-primary mt-4"
                  >
                    Upload First File
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {roomFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FaFile className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{file.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>by {file.owner}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setToast({ message: `Downloading "${file.name}" (Demo Mode)`, type: 'info' })}
                        className="btn-secondary px-3 py-1.5"
                      >
                        <FaDownload />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Meetings Tab */}
          {activeTab === 'meetings' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Meetings/Schedule</h2>
                <button
                  onClick={handleScheduleMeeting}
                  className="btn-primary"
                >
                  <FaCalendarAlt /> Schedule Meeting
                </button>
              </div>
              {roomMeetings.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FaCalendarAlt className="text-4xl mx-auto mb-3 opacity-50" />
                  <p>No meetings scheduled for this room</p>
                  <button
                    onClick={handleScheduleMeeting}
                    className="btn-primary mt-4"
                  >
                    Schedule First Meeting
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {roomMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                    >
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{meeting.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <FaCalendarAlt />
                          <span>{new Date(meeting.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FaUser />
                          <span>{meeting.time}</span>
                        </div>
                        {meeting.location && (
                          <div className="flex items-center gap-1">
                            <span>📍 {meeting.location}</span>
                          </div>
                        )}
                      </div>
                      {meeting.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{meeting.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rename Modal */}
        <Modal
          isOpen={showRenameModal}
          onClose={() => {
            setShowRenameModal(false)
            setNewRoomName(room.name)
          }}
          title="Rename Room"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Room Name *
              </label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter room name"
                required
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowRenameModal(false)
                  setNewRoomName(room.name)
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameRoom}
                className="btn-primary flex-1"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>

        {/* Settings Modal */}
        <Modal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          title="Room Settings"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Room Level
              </label>
              <select
                value={roomLevel}
                onChange={(e) => setRoomLevel(e.target.value as 'Normal' | 'Confidential')}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="Normal">Normal</option>
                <option value="Confidential">Confidential</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Members ({memberIds.length})
              </label>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Member management UI would go here. For now, members are managed automatically.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSettings}
                className="btn-primary flex-1"
              >
                Save Settings
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteRoom}
          title="Delete Room"
          message={`Are you sure you want to delete "${room.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
        />

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

export default RoomDetails

