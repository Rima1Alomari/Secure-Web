import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
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
  FaFile,
  FaPlus
} from 'react-icons/fa'
import { Modal, Toast, ConfirmDialog } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { ROOMS_KEY, CHAT_MESSAGES_KEY, FILES_KEY, EVENTS_KEY } from '../data/keys'
import { Room, ChatMessage, FileItem, EventItem } from '../types/models'
import { useUser } from '../contexts/UserContext'
import { trackRoomOpened } from '../utils/recentTracker'
import { getToken } from '../utils/auth'

const API_URL = import.meta.env.VITE_API_URL || '/api'

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
  const [uploading, setUploading] = useState(false)
  
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
      .map(msg => ({
        ...msg,
        // Ensure isOwn is correctly set based on current user
        isOwn: msg.senderId === user?.id || msg.isOwn === true
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    setMessages(roomMessages)
    
    // Load files for this room from backend API
    const fetchRoomFiles = async () => {
      try {
        const token = getToken() || 'mock-token-for-testing'
        const response = await axios.get(`${API_URL}/files`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        const backendFiles = response.data || []
        // Map backend files to FileItem and filter by room
        const mappedFiles = backendFiles
          .map((backendFile: any) => ({
            id: backendFile._id || backendFile.id,
            name: backendFile.name,
            size: backendFile.size,
            type: backendFile.type,
            uploadedAt: backendFile.createdAt || backendFile.uploadedAt || new Date().toISOString(),
            owner: backendFile.owner?.name || backendFile.ownerName || 'Unknown',
            ownerId: backendFile.owner?._id?.toString() || backendFile.owner?.toString() || backendFile.ownerId,
            isTrashed: false,
            isFolder: false,
            sharedWith: [id], // Assume files are shared with this room
            _backendId: backendFile._id || backendFile.id,
          }))
          .filter((file: FileItem) => 
            (file as any).sharedWith?.includes(id) || file.roomId === id
          )
        setRoomFiles(mappedFiles)
      } catch (error: any) {
        console.error('Error fetching room files:', error)
        // Fallback to localStorage if API fails
        const allFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
        const files = allFiles.filter(file => 
          file.sharedWith && file.sharedWith.includes(id)
        )
        setRoomFiles(files)
      }
    }
    
    fetchRoomFiles()
    
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
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !id) return

      await uploadFileToBackend(file, id)
    }
    input.click()
  }

  const uploadFileToBackend = async (file: globalThis.File, roomId: string) => {
    try {
      setUploading(true)
      const token = getToken() || 'mock-token-for-testing'
      
      // Try S3 upload first, fall back to direct upload
      try {
        const uploadUrlResponse = await axios.post(
          `${API_URL}/files/upload-url`,
          {
            fileName: file.name,
            fileType: file.type
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        const { uploadUrl, s3Key, useDirectUpload } = uploadUrlResponse.data

        // If direct upload is required (S3 not configured)
        if (useDirectUpload || !uploadUrl) {
          return await uploadFileDirect(file, roomId, token)
        }

        // Upload to S3
        await axios.put(uploadUrl, file, {
          headers: {
            'Content-Type': file.type
          }
        })

        const fileHash = `hash-${Date.now()}-${file.name}`

        const completeResponse = await axios.post(
          `${API_URL}/files/complete-upload`,
          {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            s3Key: s3Key,
            fileHash: fileHash
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        const uploadedFile = completeResponse.data.file
        const newFileItem: FileItem & { _backendId?: string } = {
          id: uploadedFile._id || uploadedFile.id,
          name: uploadedFile.name,
          size: uploadedFile.size,
          type: uploadedFile.type,
          uploadedAt: uploadedFile.createdAt || uploadedFile.uploadedAt || new Date().toISOString(),
          owner: uploadedFile.owner?.name || uploadedFile.ownerName || user?.name || 'Unknown',
          ownerId: uploadedFile.owner?._id?.toString() || uploadedFile.owner?.toString() || user?.id,
          isTrashed: false,
          isFolder: false,
          sharedWith: [roomId],
          _backendId: uploadedFile._id || uploadedFile.id,
        }
        
        setRoomFiles(prev => [...prev, newFileItem])
        setToast({ 
          message: `File "${file.name}" uploaded successfully`, 
          type: 'success' 
        })
      } catch (s3Error: any) {
        // Fall back to direct upload
        console.log('S3 upload failed, using direct upload:', s3Error.message)
        await uploadFileDirect(file, roomId, token)
      }
    } catch (error: any) {
      console.error('Error uploading file:', error)
      setToast({ 
        message: error.response?.data?.error || 'Failed to upload file. Please try again.', 
        type: 'error' 
      })
    } finally {
      setUploading(false)
    }
  }

  const uploadFileDirect = async (file: globalThis.File, roomId: string, token: string) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post(
      `${API_URL}/files/direct-upload`,
      formData,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    )

    const uploadedFile = response.data.file
    const newFileItem: FileItem & { _backendId?: string } = {
      id: uploadedFile._id || uploadedFile.id,
      name: uploadedFile.name,
      size: uploadedFile.size,
      type: uploadedFile.type,
      uploadedAt: uploadedFile.createdAt || uploadedFile.uploadedAt || new Date().toISOString(),
      owner: uploadedFile.owner?.name || uploadedFile.ownerName || user?.name || 'Unknown',
      ownerId: uploadedFile.owner?._id?.toString() || uploadedFile.owner?.toString() || user?.id,
      isTrashed: false,
      isFolder: false,
      sharedWith: [roomId],
      _backendId: uploadedFile._id || uploadedFile.id,
    }
    
    setRoomFiles(prev => [...prev, newFileItem])
    setToast({ 
      message: `File "${file.name}" uploaded successfully`, 
      type: 'success' 
    })
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

  // Get initials from name (e.g., "Ahmed Alasmari" -> "AA", "Ali" -> "A")
  const getInitials = (name: string): string => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      // First letter of first name + first letter of last name
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    } else if (parts.length === 1) {
      // Single name - just first letter
      return parts[0][0].toUpperCase()
    }
    return '?'
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
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <FaUser className="text-4xl mb-3 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    // Check if message is from current user
                    // Compare by senderId first, then fallback to sender name if senderId is missing
                    const isOwn = user?.id ? (msg.senderId === user.id) : (msg.sender === user?.name || msg.isOwn === true)
                    const initials = getInitials(msg.sender || 'User')
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* For other users: Avatar on the LEFT */}
                        {!isOwn && (
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">{initials}</span>
                          </div>
                        )}
                        
                        {/* Message Container */}
                        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                          {/* Sender name and time - show for all messages */}
                          <div className={`flex items-center gap-2 mb-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{msg.sender}</span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-500">{formatTime(msg.timestamp)}</span>
                          </div>
                          
                          {/* Message Bubble */}
                          <div
                            className={`px-4 py-2.5 rounded-2xl ${
                              isOwn
                                ? 'bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-500 dark:to-green-500 text-white rounded-br-sm'
                                : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-sm border border-gray-200 dark:border-gray-600'
                            } shadow-sm`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                          </div>
                        </div>
                        
                        {/* For own messages: Avatar on the RIGHT */}
                        {isOwn && (
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">{initials}</span>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-full flex items-center justify-center transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!newMessage.trim()}
                  >
                    <FaPaperPlane className="text-sm" />
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
                  disabled={uploading}
                >
                  <FaUpload /> {uploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
              {roomFiles.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FaFile className="text-4xl mx-auto mb-3 opacity-50" />
                  <p>No files in this room yet</p>
                  <button
                    onClick={handleUploadFile}
                    className="btn-primary mt-4"
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload First File'}
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
                        onClick={async () => {
                          try {
                            const fileId = (file as any)._backendId || file.id
                            const token = getToken() || 'mock-token-for-testing'
                            
                            const response = await axios.get(
                              `${API_URL}/files/${fileId}/download-url`,
                              {
                                headers: { Authorization: `Bearer ${token}` }
                              }
                            )

                            const { downloadUrl } = response.data
                            window.open(downloadUrl, '_blank')
                            setToast({ message: `Downloading "${file.name}"`, type: 'info' })
                          } catch (error: any) {
                            console.error('Error downloading file:', error)
                            setToast({ 
                              message: error.response?.data?.error || 'Failed to download file', 
                              type: 'error' 
                            })
                          }
                        }}
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
                Manage Members ({memberIds.length})
              </label>
              <div className="space-y-3">
                {memberIds.length === 0 ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    No members added yet. Add member IDs below.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {memberIds.map((memberId, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <FaUser className="text-gray-500 dark:text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white font-medium">
                            {memberId || `Member ${index + 1}`}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const updated = memberIds.filter((_, i) => i !== index)
                            setMemberIds(updated)
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                          title="Remove member"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter member ID or email"
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement
                        const value = input.value.trim()
                        if (value && !memberIds.includes(value)) {
                          setMemberIds([...memberIds, value])
                          input.value = ''
                        }
                      }
                    }}
                  />
                  <button
                    onClick={(e) => {
                      const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                      const value = input?.value.trim()
                      if (value && !memberIds.includes(value)) {
                        setMemberIds([...memberIds, value])
                        input.value = ''
                      }
                    }}
                    className="btn-secondary px-4 py-2 text-sm"
                    title="Add member"
                  >
                    <FaPlus />
                  </button>
                </div>
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

