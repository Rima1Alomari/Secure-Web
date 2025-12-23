import { useState, useRef, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { FaPaperPlane, FaUser, FaComments, FaUsers, FaLock, FaUnlock, FaSearch, FaPlus, FaTimes, FaFileAlt, FaSpinner, FaTrash, FaLightbulb } from 'react-icons/fa'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { CHAT_MESSAGES_KEY, ROOMS_KEY, ADMIN_USERS_KEY } from '../data/keys'
import { Room, ChatMessage, DirectChat, AdminUserMock } from '../types/models'
import { useUser } from '../contexts/UserContext'
import axios from 'axios'
import { getToken } from '../utils/auth'
import { 
  subscribeToRooms, 
  subscribeToMessages, 
  sendMessage as sendFirestoreMessage,
  sendDirectMessage,
  subscribeToDirectMessages,
  subscribeToUsers,
  markMessageAsRead,
  createNotification
} from '../services/firestore'
import { useRealtimeUsers } from '../hooks/useRealtimeUsers'

type ChatType = 'room' | 'direct'
type SelectedChat = { type: ChatType; id: string; name: string } | null

const Chat = () => {
  const { user } = useUser()
  const location = useLocation()
  const [selectedChat, setSelectedChat] = useState<SelectedChat>(null)
  
  // Handle navigation from search
  useEffect(() => {
    if (location.state?.selectChat) {
      const chatData = location.state.selectChat
      setSelectedChat({
        type: chatData.type,
        id: chatData.id,
        name: chatData.name
      })
      // Clear the state to avoid re-selecting on re-render
      window.history.replaceState({}, document.title)
    }
  }, [location.state])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dmSearchQuery, setDmSearchQuery] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const { users: realtimeUsers } = useRealtimeUsers()
  const [showSummary, setShowSummary] = useState(false)
  const [conversationSummary, setConversationSummary] = useState('')
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)
  const [showAIActions, setShowAIActions] = useState(false)

  // Subscribe to rooms in real-time with localStorage fallback
  useEffect(() => {
    if (!user?.id) return

    // First, load from localStorage as fallback
    const allRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    const filteredLocalRooms = allRooms.filter((room: Room) => {
      if (room.ownerId === user.id) return true
      if (room.memberIds && room.memberIds.includes(user.id)) return true
      return false
    })
    setRooms(filteredLocalRooms)

    // Then subscribe to Firestore for real-time updates
    const unsubscribe = subscribeToRooms((firestoreRooms) => {
      // Filter rooms: user must be owner OR member
      const filteredRooms = firestoreRooms.filter((room: any) => {
        if (room.ownerId === user.id) return true
        if (room.memberIds && room.memberIds.includes(user.id)) return true
        return false
      })
      // Only update if we have rooms from Firestore, otherwise keep localStorage rooms
      if (filteredRooms.length > 0) {
        setRooms(filteredRooms)
      }
    })

    return () => unsubscribe()
  }, [user?.id])

  // Subscribe to all users in real-time with fallback
  useEffect(() => {
    // First, load from localStorage/API as fallback
    const fetchUsers = async () => {
      try {
        const token = getToken() || 'mock-token-for-testing'
        const API_URL = (import.meta as any).env?.VITE_API_URL || '/api'
        
        // Try to fetch real users from API
        try {
          const response = await axios.get(`${API_URL}/auth/users`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          if (response.data && response.data.length > 0) {
            // Map API users to format
            const mappedUsers = response.data.map((u: any) => ({
              id: u.id || u._id,
              userId: u.userId,
              name: u.name,
              email: u.email,
              role: u.role === 'admin' ? 'Admin' : 'User',
              status: 'Active',
              createdAt: new Date().toISOString()
            }))
            setAllUsers(mappedUsers)
            // Also save to localStorage
            setJSON(ADMIN_USERS_KEY, mappedUsers)
            return
          }
        } catch (apiError) {
          console.warn('API fetch failed, trying localStorage:', apiError)
        }
        
        // Fallback to localStorage
        const localUsers = getJSON<AdminUserMock[]>(ADMIN_USERS_KEY, []) || []
        if (localUsers.length > 0) {
          setAllUsers(localUsers)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }
    
    fetchUsers()
    
    // Then subscribe to Firestore for real-time updates
    try {
      const unsubscribe = subscribeToUsers((firestoreUsers) => {
        if (firestoreUsers && firestoreUsers.length > 0) {
          // Map Firestore users to format
          const mappedUsers = firestoreUsers.map((u: any) => ({
            id: u.id,
            userId: u.userId || u.id,
            name: u.name || u.email,
            email: u.email,
            role: u.role === 'admin' ? 'Admin' : 'User',
            status: u.isOnline ? 'Active' : (u.status || 'Active'),
            createdAt: u.createdAt || new Date().toISOString()
          }))
          setAllUsers(mappedUsers)
          // Also save to localStorage
          setJSON(ADMIN_USERS_KEY, mappedUsers)
        }
      })
      
      return () => unsubscribe()
    } catch (error) {
      console.error('Error subscribing to Firestore users:', error)
      // Continue with localStorage/API users only
    }
  }, [])

  // Merge users from both sources (realtime and local), deduplicate by id
  const availableUsers = useMemo(() => {
    const userMap = new Map<string, any>()
    
    // First add allUsers (from API/localStorage)
    allUsers.forEach((u: any) => {
      if (u.id) {
        userMap.set(u.id, u)
      }
    })
    
    // Then add/update with realtimeUsers (from Firestore)
    realtimeUsers.forEach((u: any) => {
      if (u.id) {
        userMap.set(u.id, u)
      }
    })
    
    return Array.from(userMap.values())
  }, [realtimeUsers, allUsers])

  // Get all messages from localStorage for computing direct chats
  // This includes all messages, not just the selected chat
  const allMessages: ChatMessage[] = useMemo(() => {
    // Load all messages from localStorage to compute direct chats
    const storedMessages = getJSON<ChatMessage[]>(CHAT_MESSAGES_KEY, []) || []
    return storedMessages
  }, [refreshKey])

  // Get direct chats (simple implementation)
  const directChats = useMemo(() => {
    if (!user?.id) return []
    
    const chatMap = new Map<string, DirectChat>()
    
    // Find all direct messages (messages without roomId but with recipientId)
    allMessages.forEach(msg => {
      if (!msg.roomId && msg.recipientId && msg.senderId) {
        // Determine the other user
        const otherUserId = msg.senderId === user.id ? msg.recipientId : msg.senderId
        
        // Get the other user's name from availableUsers
        const otherUser = availableUsers.find((u: any) => u.id === otherUserId)
        const otherUserName = otherUser?.name || otherUser?.email || msg.sender || otherUserId
        
        // Create chat ID (sorted user IDs)
        const chatId = [user.id, otherUserId].sort().join('-')
        
        if (!chatMap.has(chatId)) {
          chatMap.set(chatId, {
            id: chatId,
            userId: otherUserId,
            userName: otherUserName,
            lastMessage: msg.message,
            lastMessageTime: typeof msg.timestamp === 'string' ? msg.timestamp : msg.timestamp.toISOString(),
            unreadCount: 0,
          })
        } else {
          const chat = chatMap.get(chatId)!
          const msgTime = typeof msg.timestamp === 'string' ? msg.timestamp : msg.timestamp.toISOString()
          if (msgTime > (chat.lastMessageTime || '')) {
            chat.lastMessage = msg.message
            chat.lastMessageTime = msgTime
          }
          if (!msg.isOwn && msg.read !== true) {
            chat.unreadCount = (chat.unreadCount || 0) + 1
          }
        }
      }
    })
    
    return Array.from(chatMap.values()).sort((a, b) => 
      new Date(b.lastMessageTime || '').getTime() - new Date(a.lastMessageTime || '').getTime()
    )
  }, [allMessages, user?.id, availableUsers])

  // Filter direct chats by search query
  const filteredDirectChats = useMemo(() => {
    if (!dmSearchQuery.trim()) return directChats
    
    const query = dmSearchQuery.toLowerCase()
    return directChats.filter(chat => 
      chat.userName.toLowerCase().includes(query) ||
      chat.userId.toLowerCase().includes(query)
    )
  }, [directChats, dmSearchQuery])

  // Get filtered users for "Start chat" - ONLY show when searching
  const filteredUsersForChat = useMemo(() => {
    const query = dmSearchQuery.toLowerCase().trim()
    
    // Only show users when there's a search query
    if (!query) {
      return []
    }
    
    // Get users who don't have existing direct chats
    const existingChatUserIds = new Set(directChats.map(chat => chat.userId))
    const usersToShow = availableUsers.filter((u: any) => 
      u.id !== user?.id && !existingChatUserIds.has(u.id)
    )
    
    // Filter by query
    return usersToShow
      .filter((u: any) => {
        const name = (u.name || u.email || '').toLowerCase()
        const email = (u.email || '').toLowerCase()
        return name.includes(query) || email.includes(query)
      })
      .slice(0, 10)
  }, [availableUsers, dmSearchQuery, directChats, user?.id])

  const handleStartChat = (targetUserId: string, targetUserName: string) => {
    if (!user?.id) return
    
    const chatId = [user.id, targetUserId].sort().join('-')
    setSelectedChat({ type: 'direct', id: chatId, name: targetUserName })
    setDmSearchQuery('')
  }

  // Load messages for selected chat - real-time subscription
  useEffect(() => {
    if (!selectedChat || !user?.id) {
      setMessages([])
      return
    }

    let unsubscribe: (() => void) | null = null

    if (selectedChat.type === 'room') {
      // Subscribe to room messages
      unsubscribe = subscribeToMessages(selectedChat.id, (firestoreMessages) => {
        const formattedMessages: ChatMessage[] = firestoreMessages.map((msg: any) => ({
          id: msg.id,
          sender: msg.senderName || msg.userName || 'Unknown',
          senderId: msg.userId || msg.senderId,
          message: msg.text || msg.content || msg.message || '',
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
          isOwn: (msg.userId || msg.senderId) === user.id,
          read: msg.readBy?.includes(user.id) || false,
          roomId: msg.roomId
        }))

        // Mark messages as read
        formattedMessages.forEach(msg => {
          if (!msg.isOwn && !msg.read) {
            markMessageAsRead(msg.id, user.id).catch(console.error)
          }
        })

        setMessages(formattedMessages)
      })
    } else {
      // For direct messages, subscribe to Firestore for real-time updates
      const chatId = selectedChat.id.split('-')
      const userId1 = chatId[0]
      const userId2 = chatId[1]
      
      try {
        unsubscribe = subscribeToDirectMessages(userId1, userId2, (firestoreMessages) => {
          const formattedMessages: ChatMessage[] = firestoreMessages.map((msg: any) => ({
            id: msg.id,
            sender: msg.senderName || msg.userName || 'Unknown',
            senderId: msg.userId || msg.senderId,
            message: msg.text || msg.content || msg.message || '',
            timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
            isOwn: (msg.userId || msg.senderId) === user.id,
            read: msg.readBy?.includes(user.id) || false,
            recipientId: msg.recipientId
          }))
          
          // Sync to localStorage for direct chats list
          const allMessages = getJSON<ChatMessage[]>(CHAT_MESSAGES_KEY, []) || []
          const messageMap = new Map(allMessages.map(m => [m.id, m]))
          formattedMessages.forEach(msg => {
            if (!messageMap.has(msg.id)) {
              messageMap.set(msg.id, msg)
            }
          })
          setJSON(CHAT_MESSAGES_KEY, Array.from(messageMap.values()))
          setRefreshKey(prev => prev + 1)
          
          // Mark messages as read
          formattedMessages.forEach(msg => {
            if (!msg.isOwn && !msg.read) {
              markMessageAsRead(msg.id, user.id).catch(console.error)
            }
          })
          
          setMessages(formattedMessages)
        })
      } catch (error) {
        console.error('Error subscribing to direct messages, falling back to localStorage:', error)
        // Fallback to localStorage
        const chatMessages = getJSON<ChatMessage[]>(CHAT_MESSAGES_KEY, []) || []
        const filtered = chatMessages
          .filter(msg => {
            return (
              !msg.roomId &&
              ((msg.senderId === userId1 && msg.recipientId === userId2) ||
               (msg.senderId === userId2 && msg.recipientId === userId1))
            )
          })
          .map(msg => ({
            ...msg,
            // Ensure isOwn is correctly set based on current user
            isOwn: user?.id ? (msg.senderId === user.id || msg.isOwn === true) : (msg.isOwn === true)
          }))
          .sort((a, b) => {
            const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime()
            const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime()
            return timeA - timeB
          })
        setMessages(filtered)
      }
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [selectedChat, user?.id])


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) return

    const messageText = newMessage.trim()
    setNewMessage('') // Clear input immediately for better UX

    if (selectedChat.type === 'room') {
      // Send to Firestore for room chat
      try {
        await sendFirestoreMessage(selectedChat.id, {
          text: messageText,
          senderName: user.name || user.email || 'Unknown',
          userName: user.name || user.email || 'Unknown'
        })
        
        // Create notifications for all room members except sender
        try {
          const room = rooms.find(r => r.id === selectedChat.id)
          if (room) {
            const memberIds = room.memberIds || []
            const recipientIds = memberIds.filter(id => id !== user.id)
            
            await Promise.all(recipientIds.map(recipientId => 
              createNotification({
                userId: recipientId,
                message: `${user.name || user.email} sent a message in ${room.name}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`,
                type: 'message',
                link: `/rooms/${selectedChat.id}`
              }).catch(err => console.error('Error creating notification:', err))
            ))
          }
        } catch (error) {
          console.error('Error creating room notifications:', error)
        }
        
        // Messages will update automatically via subscription
      } catch (error) {
        console.error('Error sending message:', error)
        // Re-add message to input on error
        setNewMessage(messageText)
      }
    } else {
      // Direct chat: use Firestore for real-time sync
      const chatId = selectedChat.id.split('-')
      const recipientId = chatId[0] === user.id ? chatId[1] : chatId[0]
      
      try {
        // Send to Firestore for real-time sync
        await sendDirectMessage(user.id, recipientId, {
          text: messageText,
          senderName: user.name || user.email || 'Unknown',
          userName: user.name || user.email || 'Unknown',
          message: messageText
        })
        
        // Create notification for recipient
        try {
          await createNotification({
            userId: recipientId,
            message: `${user.name || user.email} sent you a message: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`,
            type: 'message',
            link: `/chat`
          })
        } catch (error) {
          console.error('Error creating notification:', error)
          // Continue even if notification fails
        }
        
        // Messages will update automatically via subscription
      } catch (error) {
        console.error('Error sending direct message to Firestore, falling back to localStorage:', error)
        
        // Fallback to localStorage
        const message: ChatMessage = {
          id: uuid(),
          sender: user.name || 'You',
          senderId: user.id,
          message: messageText,
          timestamp: nowISO(),
          isOwn: true,
          read: false,
          recipientId
        }

        const allMessages = getJSON<ChatMessage[]>(CHAT_MESSAGES_KEY, []) || []
        const updatedMessages = [...allMessages, message]
        setJSON(CHAT_MESSAGES_KEY, updatedMessages)
        
        // Update local messages state
        setMessages(prev => [...prev, message])
        setRefreshKey(prev => prev + 1)
        
        // Scroll to bottom after message is added
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      }
    }
  }

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

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

  // Get room chats with last message info
  const roomChats = useMemo(() => {
    return rooms.map(room => {
      const roomMessages = allMessages
        .filter(msg => msg.roomId === room.id)
        .sort((a, b) => {
          const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime()
          const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime()
          return timeB - timeA
        })
      
      const lastMessage = roomMessages[0]
      const unreadCount = roomMessages.filter(msg => !msg.isOwn && msg.read !== true).length
      
      return {
        ...room,
        lastMessage: lastMessage?.message || 'No messages yet',
        lastMessageTime: lastMessage?.timestamp || room.updatedAt,
        unreadCount: unreadCount || 0,
      }
    }).sort((a, b) => {
      const timeA = new Date(a.lastMessageTime || a.updatedAt).getTime()
      const timeB = new Date(b.lastMessageTime || b.updatedAt).getTime()
      return timeB - timeA
    })
  }, [rooms, allMessages])

  return (
    <div className="page-content">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Chat</h1>
        </div>

        <div className="card flex" style={{ height: 'calc(100vh - 250px)', minHeight: '600px' }}>
          {/* Chat List Sidebar */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Room Chats Section */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-[11px] font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-[0.08em] opacity-70 mb-2">
                Rooms
              </h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {roomChats.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-500 text-center py-3">
                    No rooms
                  </p>
                ) : (
                  roomChats.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedChat({ type: 'room', id: room.id, name: room.name })}
                      className={`w-full text-left p-2.5 rounded-lg transition-colors relative ${
                        selectedChat?.type === 'room' && selectedChat.id === room.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500 dark:border-blue-400'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        {room.isPrivate ? (
                          <FaLock className="text-gray-500 dark:text-gray-400 text-[10px] flex-shrink-0" />
                        ) : (
                          <FaUnlock className="text-gray-500 dark:text-gray-400 text-[10px] flex-shrink-0" />
                        )}
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate flex-1">
                          {room.name}
                        </h4>
                        {room.unreadCount > 0 && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full ml-auto">
                            {room.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                        <p className="truncate flex-1">
                          {room.lastMessage}
                        </p>
                        <span className="text-[10px] text-gray-400 dark:text-gray-600 flex-shrink-0">
                          {(() => {
                            const time = room.lastMessageTime || room.updatedAt
                            const timeStr = typeof time === 'string' ? time : new Date(time).toISOString()
                            return formatTimeAgo(timeStr)
                          })()}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Direct Chats Section */}
            <div className="p-3 flex-1 overflow-y-auto flex flex-col">
              <h3 className="text-[11px] font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-[0.08em] opacity-70 mb-2">
                Direct Messages
              </h3>
              
              {/* Search Input */}
              <div className="mb-2">
                <div className="relative">
                  <FaSearch className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                  <input
                    type="text"
                    value={dmSearchQuery}
                    onChange={(e) => setDmSearchQuery(e.target.value)}
                    placeholder="Search users…"
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 flex-1 overflow-y-auto">
                {/* Existing Direct Chats */}
                {filteredDirectChats.length > 0 && (
                  <>
                    {filteredDirectChats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => setSelectedChat({ type: 'direct', id: chat.id, name: chat.userName })}
                        className={`w-full text-left p-2.5 rounded-lg transition-colors relative ${
                          selectedChat?.type === 'direct' && selectedChat.id === chat.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500 dark:border-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <div className="w-7 h-7 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <FaUser className="text-white text-[10px]" />
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate flex-1">
                            {chat.userName}
                          </h4>
                          {chat.unreadCount && chat.unreadCount > 0 && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full ml-auto">
                              {chat.unreadCount}
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                            <p className="truncate flex-1">
                              {chat.lastMessage}
                            </p>
                            {chat.lastMessageTime && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-600 flex-shrink-0">
                                {formatTimeAgo(chat.lastMessageTime)}
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    ))}
                    {filteredUsersForChat.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                    )}
                  </>
                )}

                {/* Users to Start Chat With - Always shown */}
                {filteredUsersForChat.length > 0 ? (
                  <>
                    {filteredDirectChats.length === 0 && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-2 px-1">
                        Available users to chat with:
                      </p>
                    )}
                    {filteredUsersForChat.map((userItem) => (
                      <button
                        key={userItem.id}
                        onClick={() => handleStartChat(userItem.id, userItem.name)}
                        className="w-full text-left p-2.5 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2"
                      >
                        <div className="w-7 h-7 bg-green-600 dark:bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <FaUser className="text-white text-[10px]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {userItem.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                            {userItem.email}
                          </p>
                        </div>
                        <FaPlus className="text-blue-600 dark:text-blue-400 text-xs flex-shrink-0" />
                      </button>
                    ))}
                  </>
                ) : filteredDirectChats.length === 0 && dmSearchQuery.trim() ? (
                  <p className="text-xs text-gray-500 dark:text-gray-500 text-center py-3">
                    No users found
                  </p>
                ) : filteredDirectChats.length === 0 && !dmSearchQuery.trim() ? (
                  <p className="text-xs text-gray-500 dark:text-gray-500 text-center py-3">
                    Search for users to start a chat
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header - Green Bar */}
                <div className="bg-green-600 dark:bg-green-700 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      {selectedChat.type === 'room' ? (
                        <FaUsers className="text-white text-sm" />
                      ) : (
                        <FaUser className="text-white text-sm" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-white">
                        {selectedChat.name}
                      </h2>
                      <p className="text-xs text-white/90">Online</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (selectedChat.type === 'direct' && selectedChat.id && user?.id) {
                        try {
                          const token = getToken() || 'mock-token-for-testing'
                          const API_URL = (import.meta as any).env?.VITE_API_URL || '/api'
                          await axios.delete(`${API_URL}/chat/direct/${selectedChat.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                          })
                          // Clear selected chat
                          setSelectedChat(null)
                          // Refresh messages
                          setRefreshKey(prev => prev + 1)
                        } catch (error) {
                          console.error('Error deleting chat:', error)
                        }
                      }
                    }}
                    className="text-white hover:text-white/80 transition-colors p-2"
                    aria-label="Delete chat"
                  >
                    <FaTrash className="text-sm" />
                  </button>
                </div>

                {/* Messages - Clean White Background */}
                <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 p-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                      <FaComments className="text-4xl mb-3 opacity-30" />
                      <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => {
                        // Ensure isOwn is correctly set based on current user
                        const isOwn = user?.id ? (msg.senderId === user.id || msg.isOwn === true) : (msg.isOwn === true)
                        
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                          >
                            {/* Message Bubble */}
                            <div className={`max-w-[75%] ${isOwn ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                              <div
                                className={`px-4 py-2.5 rounded-2xl ${
                                  isOwn
                                    ? 'bg-green-500 text-white rounded-br-sm'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                              </div>
                              <div className={`flex items-center gap-1 mt-1 px-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                  {formatTime(msg.timestamp)}
                                </span>
                                {isOwn && (
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500">✓✓</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Conversation Summary */}
                {showSummary && conversationSummary && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FaFileAlt className="text-blue-600 dark:text-blue-400" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">Conversation Summary</h4>
                      </div>
                      <button
                        onClick={() => {
                          setShowSummary(false)
                          setConversationSummary('')
                        }}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <FaTimes />
                      </button>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {conversationSummary}
                    </div>
                  </div>
                )}

                {/* AI Actions Panel - Shown when lightbulb is clicked */}
                {showAIActions && messages.length > 0 && (
                  <div className="px-4 py-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={async () => {
                        if (messages.length === 0) return
                        setIsLoadingSummary(true)
                        setShowAIActions(false) // Hide panel when summarizing
                        try {
                          const token = getToken() || 'mock-token-for-testing'
                          const API_URL = (import.meta as any).env?.VITE_API_URL || '/api'
                          const response = await axios.post(`${API_URL}/chat/summarize`, {
                            messages: messages.map(m => ({
                              sender: m.sender,
                              message: m.message
                            }))
                          }, {
                            headers: { Authorization: `Bearer ${token}` }
                          })
                          setConversationSummary(response.data.summary || '')
                          setShowSummary(true)
                        } catch (error) {
                          console.error('Error summarizing conversation:', error)
                          setConversationSummary('Failed to generate summary. Please try again.')
                          setShowSummary(true)
                        } finally {
                          setIsLoadingSummary(false)
                        }
                      }}
                      disabled={messages.length === 0 || isLoadingSummary}
                      className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {isLoadingSummary ? <FaSpinner className="animate-spin text-xs" /> : <FaFileAlt className="text-xs" />}
                      Summarize Conversation
                    </button>
                  </div>
                )}

                {/* Input Area - Light Gray Bar */}
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 flex items-center gap-3">
                  <button
                    onClick={() => setShowAIActions(!showAIActions)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      showAIActions 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    aria-label="AI Actions"
                    title="AI Features - Summarize conversations and files"
                  >
                    <FaLightbulb className="text-sm" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
                    aria-label="Send message"
                  >
                    <FaPaperPlane className="text-sm" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-500 dark:text-gray-400">
                <FaComments className="text-6xl mb-4 opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Select a chat</h3>
                <p className="text-sm text-center max-w-md">
                  Choose a room or direct message from the list to start chatting
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat
