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
  FaPlus,
  FaUserPlus,
  FaSearch,
  FaTimes
} from 'react-icons/fa'
import { Modal, Toast, ConfirmDialog } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { ROOMS_KEY, CHAT_MESSAGES_KEY, FILES_KEY, EVENTS_KEY, ADMIN_USERS_KEY } from '../data/keys'
import { Room, ChatMessage, FileItem, EventItem, AdminUserMock } from '../types/models'
import { useUser } from '../contexts/UserContext'
import { trackRoomOpened } from '../utils/recentTracker'
import { getToken } from '../utils/auth'

const API_URL = import.meta.env.VITE_API_URL || '/api'

type Tab = 'chat' | 'files' | 'meetings' | 'members'

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
  
  // Members state
  const [allUsers, setAllUsers] = useState<AdminUserMock[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('')
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  
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

    setIsLoading(true)

    const loadRoom = async () => {
      try {
        const token = getToken() || 'mock-token-for-testing'
        const response = await axios.get(`${API_URL}/rooms/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        const foundRoom = {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description || '',
          isPrivate: response.data.isPrivate || false,
          members: response.data.members || 1,
          maxMembers: response.data.maxMembers || 50,
          createdAt: response.data.createdAt,
          updatedAt: response.data.updatedAt,
          ownerId: response.data.ownerId,
          memberIds: response.data.memberIds || [],
          roomLevel: response.data.roomLevel || 'Normal',
          classification: response.data.classification || response.data.roomLevel || 'Normal'
        }
        
        setRoom(foundRoom)
        setNewRoomName(foundRoom.name)
        setRoomLevel(foundRoom.roomLevel || 'Normal')
        setMemberIds(foundRoom.memberIds || [])
        
        // Also save to localStorage as backup
        const allRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
        const updatedRooms = allRooms.filter(r => r.id !== id)
        setJSON(ROOMS_KEY, [...updatedRooms, foundRoom])
        
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
        
      } catch (error: any) {
        console.error('Error loading room:', error)
        // Fallback to localStorage
        const allRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
        const foundRoom = allRooms.find(r => r.id === id)
        
        if (!foundRoom) {
          setToast({ message: 'Room not found', type: 'error' })
          navigate('/rooms')
          setIsLoading(false)
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
                sharedWith: [id],
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
        
        // Load meetings for this room
        const allEvents = getJSON<EventItem[]>(EVENTS_KEY, []) || []
        const meetings = allEvents.filter(event => 
          event.description?.includes(`Room: ${id}`) || 
          (event as any).roomId === id
        )
        setRoomMeetings(meetings)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadRoom()
  }, [id, navigate, user?.id])

  // Load users for members management
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const token = getToken() || 'mock-token-for-testing'
        const response = await axios.get(`${API_URL}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.data && Array.isArray(response.data)) {
          const mappedUsers: AdminUserMock[] = response.data.map((u: any) => ({
            id: u.id || u._id,
            name: u.name,
            email: u.email,
            role: u.role === 'admin' ? 'Admin' : u.role === 'security' ? 'Moderator' : 'User',
            status: 'Active',
            createdAt: u.createdAt || nowISO()
          }))
          setAllUsers(mappedUsers)
          setJSON(ADMIN_USERS_KEY, mappedUsers)
        }
      } catch (error) {
        console.error('Error loading users:', error)
        const savedUsers = getJSON<AdminUserMock[]>(ADMIN_USERS_KEY, []) || []
        setAllUsers(savedUsers)
      }
    }
    
    loadUsers()
  }, [])

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

  // Get room members
  const roomMembers = useMemo(() => {
    if (!room || !room.memberIds) return []
    return room.memberIds
      .map(memberId => allUsers.find(u => u.id === memberId))
      .filter((u): u is AdminUserMock => u !== undefined)
  }, [room, allUsers])

  // Filter members by search
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return roomMembers
    const query = memberSearchQuery.toLowerCase()
    return roomMembers.filter(m => 
      m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query)
    )
  }, [roomMembers, memberSearchQuery])

  // Filter users for adding members
  const filteredUsersForAdd = useMemo(() => {
    if (!addMemberSearchQuery.trim()) return []
    const query = addMemberSearchQuery.toLowerCase()
    const memberIds = room?.memberIds || []
    return allUsers
      .filter(u => !memberIds.includes(u.id) && (u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)))
      .slice(0, 10)
  }, [allUsers, addMemberSearchQuery, room])

  const handleAddMember = async (userId: string, userName: string) => {
    if (!room) return

    try {
      const token = getToken() || 'mock-token-for-testing'
      const response = await axios.post(`${API_URL}/rooms/${room.id}/members`, {
        userId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Update local state
      const updatedMemberIds = response.data.memberIds || []
      setRoom({ ...room, memberIds: updatedMemberIds, members: response.data.members })
      setMemberIds(updatedMemberIds)
      setShowAddMemberModal(false)
      setAddMemberSearchQuery('')
      setToast({ message: `${userName} added to room`, type: 'success' })
    } catch (error: any) {
      console.error('Error adding member:', error)
      const errorMsg = error.response?.data?.error || 'Failed to add member'
      setToast({ message: errorMsg, type: errorMsg.includes('already') ? 'warning' : 'error' })
    }
  }

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!room || role !== 'admin') return

    try {
      const token = getToken() || 'mock-token-for-testing'
      const response = await axios.delete(`${API_URL}/rooms/${room.id}/members/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      // Update local state
      const updatedMemberIds = response.data.memberIds || []
      setRoom({ ...room, memberIds: updatedMemberIds, members: response.data.members })
      setMemberIds(updatedMemberIds)
      setToast({ message: `${userName} removed from room`, type: 'success' })
    } catch (error: any) {
      console.error('Error removing member:', error)
      setToast({ 
        message: error.response?.data?.error || 'Failed to remove member. Please try again.', 
        type: 'error' 
      })
    }
  }

  const handleScheduleMeeting = () => {
    navigate('/calendar', { state: { roomId: id } })
  }

  const handleRenameRoom = async () => {
    if (!newRoomName.trim() || !id) return

    try {
      const token = getToken() || 'mock-token-for-testing'
      const response = await axios.put(`${API_URL}/rooms/${id}`, {
        name: newRoomName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const updatedRoom = {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description || '',
        isPrivate: response.data.isPrivate || false,
        members: response.data.members || 1,
        maxMembers: response.data.maxMembers || 50,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt,
        ownerId: response.data.ownerId,
        memberIds: response.data.memberIds || [],
        roomLevel: response.data.roomLevel || 'Normal',
        classification: response.data.classification || response.data.roomLevel || 'Normal'
      }
      
      setRoom(updatedRoom)
      setShowRenameModal(false)
      setToast({ message: 'Room renamed', type: 'success' })
    } catch (error: any) {
      console.error('Error renaming room:', error)
      setToast({ 
        message: error.response?.data?.error || 'Failed to rename room. Please try again.', 
        type: 'error' 
      })
    }
  }

  const handleDeleteRoom = async () => {
    if (!id) return

    try {
      const token = getToken() || 'mock-token-for-testing'
      await axios.delete(`${API_URL}/rooms/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setShowDeleteConfirm(false)
      navigate('/rooms')
      setToast({ message: 'Room deleted successfully', type: 'success' })
    } catch (error: any) {
      console.error('Error deleting room:', error)
      setToast({ 
        message: error.response?.data?.error || 'Failed to delete room. Please try again.', 
        type: 'error' 
      })
    }
  }

  const handleUpdateSettings = async () => {
    if (!id) return

    try {
      const token = getToken() || 'mock-token-for-testing'
      const response = await axios.put(`${API_URL}/rooms/${id}`, {
        roomLevel,
        classification: roomLevel,
        memberIds
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      const updatedRoom = {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description || '',
        isPrivate: response.data.isPrivate || false,
        members: response.data.members || 1,
        maxMembers: response.data.maxMembers || 50,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt,
        ownerId: response.data.ownerId,
        memberIds: response.data.memberIds || [],
        roomLevel: response.data.roomLevel || 'Normal',
        classification: response.data.classification || response.data.roomLevel || 'Normal'
      }
      
      setRoom(updatedRoom)
      setShowSettingsModal(false)
      setToast({ message: 'Room settings updated', type: 'success' })
    } catch (error: any) {
      console.error('Error updating room settings:', error)
      setToast({ 
        message: error.response?.data?.error || 'Failed to update room settings. Please try again.', 
        type: 'error' 
      })
    }
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
          <button
            onClick={() => setActiveTab('members')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'members'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Members
          </button>
        </div>

        {/* Tab Content */}
        <div className="card">
          {/* Chat Tab - WhatsApp Style */}
          {activeTab === 'chat' && (
            <div className="flex flex-col" style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}>
              {/* Messages - WhatsApp Style */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'100\' height=\'100\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 100 0 L 0 0 0 100\' fill=\'none\' stroke=\'%23e5e7eb\' stroke-width=\'0.5\' opacity=\'0.3\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23grid)\'/%3E%3C/svg%3E")' }}>
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                    <FaUser className="text-4xl mb-3 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {messages.map((msg, index) => {
                      // Check if previous message is from same sender and within 5 minutes
                      const prevMsg = index > 0 ? messages[index - 1] : null
                      const showAvatar = !msg.isOwn && (
                        !prevMsg || 
                        prevMsg.senderId !== msg.senderId || 
                        (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) > 300000
                      )
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 px-2 py-0.5 ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          {/* Avatar for received messages */}
                          {!msg.isOwn && (
                            <div className={`flex-shrink-0 ${showAvatar ? 'w-8 h-8' : 'w-0'} transition-all duration-200`}>
                              {showAvatar && (
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500 text-white text-xs font-semibold">
                                  {msg.sender ? msg.sender.charAt(0).toUpperCase() : 'U'}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Message bubble */}
                          <div className={`flex flex-col ${msg.isOwn ? 'items-end' : 'items-start'} max-w-[65%] sm:max-w-[70%]`}>
                            {/* Sender name - always show for clarity */}
                            {!msg.isOwn && (
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
                                {msg.sender || 'Unknown'}
                              </span>
                            )}
                            {msg.isOwn && (
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5 px-1">
                                {user?.name || 'You'}
                              </span>
                            )}
                            
                            {/* Message bubble with WhatsApp style */}
                            <div
                              className={`relative px-3 py-2 rounded-lg shadow-sm ${
                                msg.isOwn
                                  ? 'bg-green-500 dark:bg-green-600 text-white rounded-br-sm'
                                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
                              }`}
                              style={{
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                              }}
                            >
                              <span className="text-sm whitespace-pre-wrap break-words">{msg.message}</span>
                              
                              {/* Timestamp */}
                              <div className={`flex items-center justify-end gap-1 mt-0.5 ${msg.isOwn ? 'text-green-50' : 'text-gray-500 dark:text-gray-400'}`}>
                                <span className="text-[11px] opacity-75">
                                  {formatTime(msg.timestamp)}
                                </span>
                                {msg.isOwn && (
                                  <span className="text-[11px] opacity-75">
                                    {msg.read ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Spacer for sent messages */}
                          {msg.isOwn && <div className="w-0"></div>}
                        </div>
                      )
                    })}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Input Area - WhatsApp Style */}
              <div className="p-3 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-end gap-2">
                  <div className="flex-1 flex items-end bg-white dark:bg-gray-700 rounded-full px-4 py-2 border border-gray-300 dark:border-gray-600 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-500/20 transition-all">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none text-sm"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="w-10 h-10 bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white rounded-full flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    title="Send message"
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

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Members ({roomMembers.length})
                </h2>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="btn-primary"
                >
                  <FaUserPlus /> Add Member
                </button>
              </div>

              {/* Search Members */}
              <div className="mb-4">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Search members…"
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {filteredMembers.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FaUsers className="text-4xl mx-auto mb-3 opacity-50" />
                  <p>{memberSearchQuery.trim() ? 'No members found' : 'No members in this room'}</p>
                  {!memberSearchQuery.trim() && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="btn-primary mt-4"
                    >
                      <FaUserPlus /> Add First Member
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <FaUser className="text-white text-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {member.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {member.email}
                          </p>
                        </div>
                        {member.role && (
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            member.role === 'Admin' 
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                              : member.role === 'Moderator'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {member.role}
                          </span>
                        )}
                      </div>
                      {role === 'admin' && (
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-3"
                          title="Remove member"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Member Modal */}
        <Modal
          isOpen={showAddMemberModal}
          onClose={() => {
            setShowAddMemberModal(false)
            setAddMemberSearchQuery('')
          }}
          title="Add Member to Room"
        >
          <div className="space-y-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={addMemberSearchQuery}
                onChange={(e) => setAddMemberSearchQuery(e.target.value)}
                placeholder="Search users…"
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredUsersForAdd.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-4">
                  {addMemberSearchQuery.trim() ? 'No users found' : 'Start typing to search users'}
                </p>
              ) : (
                filteredUsersForAdd.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAddMember(user.id, user.name)}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-green-600 dark:bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <FaUser className="text-white text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <FaPlus className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </Modal>

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

