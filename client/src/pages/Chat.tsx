import { useState, useRef, useEffect, useMemo } from 'react'
import { FaPaperPlane, FaUser, FaComments, FaUsers, FaLock, FaUnlock, FaSearch, FaPlus, FaTimes, FaLightbulb, FaFileAlt, FaSpinner, FaTrash } from 'react-icons/fa'
import axios from 'axios'
import { getJSON, setJSON, nowISO } from '../data/storage'
import { ROOMS_KEY, CHAT_MESSAGES_KEY, ADMIN_USERS_KEY } from '../data/keys'
import { Room, ChatMessage, DirectChat, AdminUserMock } from '../types/models'
import { useUser } from '../contexts/UserContext'
import { getToken } from '../utils/auth'

const API_URL = (import.meta as any).env.VITE_API_URL || '/api'

type ChatType = 'room' | 'direct'
type SelectedChat = { type: ChatType; id: string; name: string } | null

const Chat = () => {
  const { user } = useUser()
  const [selectedChat, setSelectedChat] = useState<SelectedChat>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [dmSearchQuery, setDmSearchQuery] = useState('')
  const [messageSearchQuery, setMessageSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [showAIFeatures, setShowAIFeatures] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [conversationSummary, setConversationSummary] = useState('')
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)

  // State for rooms from API
  const [roomsFromAPI, setRoomsFromAPI] = useState<Room[]>([])

  // Fetch rooms from API
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = getToken() || 'mock-token-for-testing'
        const response = await axios.get(`${API_URL}/rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.data && Array.isArray(response.data)) {
          const apiRooms = response.data.map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description || '',
            isPrivate: r.isPrivate || false,
            members: r.members || 1,
            maxMembers: r.maxMembers || 50,
            createdAt: r.createdAt || nowISO(),
            updatedAt: r.updatedAt || nowISO(),
            ownerId: r.ownerId,
            memberIds: r.memberIds || [],
            roomLevel: r.roomLevel || 'Normal',
            classification: r.classification || r.roomLevel || 'Normal'
          }))
          setRoomsFromAPI(apiRooms)
          // Also save to localStorage as backup
          setJSON(ROOMS_KEY, apiRooms)
        }
      } catch (error) {
        console.error('Error fetching rooms from API:', error)
        // Fallback to localStorage
        const savedRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
        setRoomsFromAPI(savedRooms)
      }
    }
    
    if (user?.id) {
      fetchRooms()
    }
  }, [refreshKey, user?.id])

  // Get rooms
  const rooms = roomsFromAPI

  // Get all messages (not user-scoped, as chat messages are shared)
  const allMessages = useMemo(() => {
    try {
      const baseKey = CHAT_MESSAGES_KEY
      const stored = localStorage.getItem(baseKey)
      if (stored) {
        return JSON.parse(stored) as ChatMessage[]
      }
    } catch (error) {
      console.error('Error reading chat messages from localStorage:', error)
    }
    return []
  }, [refreshKey])

  // Get all users for search - fetch from backend API
  const [allUsers, setAllUsers] = useState<AdminUserMock[]>([])
  const [searchedUsers, setSearchedUsers] = useState<AdminUserMock[]>([])
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const token = getToken() || 'mock-token-for-testing'
        const response = await axios.get(`${API_URL}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.data && Array.isArray(response.data)) {
          // Map backend users to AdminUserMock format
          const mappedUsers: AdminUserMock[] = response.data.map((u: any) => ({
            id: u.id || u._id,
            name: u.name,
            email: u.email,
            role: u.role === 'admin' ? 'Admin' : u.role === 'security' ? 'Moderator' : 'User',
            status: 'Active',
            createdAt: u.createdAt || nowISO()
          }))
          setAllUsers(mappedUsers)
          // Also save to localStorage as backup
          setJSON(ADMIN_USERS_KEY, mappedUsers)
        }
      } catch (error) {
        console.error('Error loading users for chat:', error)
        // Fallback to localStorage
        const savedUsers = getJSON<AdminUserMock[]>(ADMIN_USERS_KEY, []) || []
        setAllUsers(savedUsers)
      }
    }
    
    loadUsers()
  }, [])

  // Search users by email in real-time
  useEffect(() => {
    const searchUsersByEmail = async () => {
      const query = dmSearchQuery.trim()
      
      // If query looks like an email (contains @) or is longer than 2 characters, search
      if (query.length >= 2 && (query.includes('@') || query.length > 2)) {
        setIsSearchingUsers(true)
        try {
          const token = getToken() || 'mock-token-for-testing'
          const response = await axios.get(`${API_URL}/auth/users/search`, {
            params: { query },
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
            setSearchedUsers(mappedUsers)
            console.log(`Found ${mappedUsers.length} users for query: "${query}"`)
          } else {
            setSearchedUsers([])
            console.log(`No users found for query: "${query}"`)
          }
        } catch (error: any) {
          console.error('Error searching users:', error)
          console.error('Error details:', error.response?.data || error.message)
          setSearchedUsers([])
        } finally {
          setIsSearchingUsers(false)
        }
      } else {
        setSearchedUsers([])
      }
    }

    // Debounce the search
    const timeoutId = setTimeout(searchUsersByEmail, 300)
    return () => clearTimeout(timeoutId)
  }, [dmSearchQuery])

  // Get room members when a room is selected
  const roomMembers = useMemo(() => {
    if (!selectedChat || selectedChat.type !== 'room') return []
    
    const room = rooms.find(r => r.id === selectedChat.id)
    if (!room || !room.memberIds) return []
    
    // Map member IDs to user objects
    return room.memberIds
      .map(memberId => allUsers.find(u => u.id === memberId))
      .filter((u): u is AdminUserMock => u !== undefined)
  }, [selectedChat, rooms, allUsers])

  // Get direct chats (simple implementation)
  const directChats = useMemo(() => {
    if (!user?.id) return []
    
    const chatMap = new Map<string, DirectChat>()
    
    // Find all direct messages (messages without roomId but with recipientId)
    allMessages.forEach(msg => {
      if (!msg.roomId && msg.recipientId && msg.senderId) {
        // Determine the other user
        const otherUserId = msg.senderId === user.id ? msg.recipientId : msg.senderId
        const otherUserName = msg.senderId === user.id ? msg.recipientId : msg.sender
        
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
  }, [allMessages, user?.id])

  // Filter direct chats by search query
  const filteredDirectChats = useMemo(() => {
    if (!dmSearchQuery.trim()) return directChats
    
    const query = dmSearchQuery.toLowerCase()
    return directChats.filter(chat => 
      chat.userName.toLowerCase().includes(query) ||
      chat.userId.toLowerCase().includes(query)
    )
  }, [directChats, dmSearchQuery])

  // Get filtered users for "Start chat" - show all users when no search, or filtered when searching
  const filteredUsersForChat = useMemo(() => {
    const query = dmSearchQuery.toLowerCase().trim()
    
    // Get users who don't have existing direct chats
    const existingChatUserIds = new Set(directChats.map(chat => chat.userId))
    
    // If we have searched users (from API), use those; otherwise use allUsers
    const usersToFilter = searchedUsers.length > 0 ? searchedUsers : allUsers
    const availableUsers = usersToFilter.filter(u => 
      u.id !== user?.id && !existingChatUserIds.has(u.id)
    )
    
    // If searching with API results, return those directly
    if (searchedUsers.length > 0) {
      return availableUsers.slice(0, 10)
    }
    
    // If searching locally, filter by query
    if (query) {
      return availableUsers
        .filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
        .slice(0, 10)
    } else {
      // Show all available users (limit to 20 for performance)
      return availableUsers.slice(0, 20)
    }
  }, [allUsers, searchedUsers, dmSearchQuery, directChats, user?.id])

  const handleStartChat = (targetUserId: string, targetUserName: string) => {
    if (!user?.id) return
    
    const chatId = [user.id, targetUserId].sort().join('-')
    setSelectedChat({ type: 'direct', id: chatId, name: targetUserName })
    setDmSearchQuery('')
  }

  const handleDeleteChat = async () => {
    if (!selectedChat || !user || user.role !== 'admin') {
      console.error('Only admins can delete conversations')
      alert('Only admins can delete conversations')
      return
    }

    // Store chat info before clearing
    const chatToDelete = { ...selectedChat }
    const chatType = chatToDelete.type
    const chatId = chatToDelete.id

    try {
      const token = getToken() || 'mock-token-for-testing'
      
      if (chatType === 'room') {
        // Delete room messages
        const response = await axios.delete(`${API_URL}/chat/room/${chatId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log('✅ Room messages deleted:', response.data)
      } else {
        // Delete direct messages - extract other user ID
        const chatIdParts = chatId.split('-')
        const otherUserId = chatIdParts[0] === user.id ? chatIdParts[1] : chatIdParts[0]
        
        if (!otherUserId) {
          console.error('Cannot determine other user ID from chat ID:', chatId)
          alert('Cannot determine recipient ID')
          return
        }
        
        const response = await axios.delete(`${API_URL}/chat/direct/${otherUserId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log('✅ Direct messages deleted:', response.data)
      }

      // Clear from localStorage BEFORE clearing UI state
      try {
        const baseKey = CHAT_MESSAGES_KEY
        const existingMessages = JSON.parse(localStorage.getItem(baseKey) || '[]') || []
        const filteredMessages = existingMessages.filter((msg: ChatMessage) => {
          if (chatType === 'room') {
            return msg.roomId !== chatId
          } else {
            const chatIdParts = chatId.split('-')
            return !(
              (!msg.roomId &&
               ((msg.senderId === chatIdParts[0] && msg.recipientId === chatIdParts[1]) ||
                (msg.senderId === chatIdParts[1] && msg.recipientId === chatIdParts[0])))
            )
          }
        })
        localStorage.setItem(baseKey, JSON.stringify(filteredMessages))
        console.log('✅ Messages cleared from localStorage')
      } catch (error) {
        console.error('Error clearing messages from localStorage:', error)
      }

      // Clear messages from UI and close chat
      setMessages([])
      setSelectedChat(null)
      setRefreshKey(prev => prev + 1)
      
      console.log('✅ Conversation deleted successfully')
    } catch (error: any) {
      console.error('❌ Error deleting conversation:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete conversation'
      alert(`Error: ${errorMessage}`)
    }
  }

  // Fetch messages from API
  const fetchMessages = async () => {
    if (!selectedChat || !user) return

    // Don't show loading spinner during polling (only on initial load)
    const isInitialLoad = messages.length === 0
    if (isInitialLoad) {
      setIsLoadingMessages(true)
    }
    try {
      const token = getToken() || 'mock-token-for-testing'
      let response

      if (selectedChat.type === 'room') {
        response = await axios.get(`${API_URL}/chat/room/${selectedChat.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        // Direct chat: extract other user ID from chat ID
        const chatId = selectedChat.id.split('-')
        const otherUserId = chatId[0] === user.id ? chatId[1] : chatId[0]
        
        if (!otherUserId) {
          console.error('Cannot determine other user ID from chat ID:', selectedChat.id)
          if (isInitialLoad) setIsLoadingMessages(false)
          return
        }
        
        console.log(`Fetching direct messages with user: ${otherUserId} (current user: ${user.id})`)
        response = await axios.get(`${API_URL}/chat/direct/${otherUserId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log(`Received ${response.data.length} messages from API`)
      }

      const apiMessages = response.data.map((msg: any) => {
        // Normalize senderId to string for comparison
        const msgSenderId = msg.senderId ? String(msg.senderId) : (msg.sender?._id ? String(msg.sender._id) : String(msg.sender || ''))
        const currentUserId = String(user.id)
        
        // Ensure timestamp is a string
        let timestampStr = msg.timestamp
        if (!timestampStr) {
          timestampStr = new Date().toISOString()
        } else if (typeof timestampStr !== 'string') {
          timestampStr = new Date(timestampStr).toISOString()
        }
        
        return {
          id: msg.id || String(msg._id || Date.now()),
          message: msg.message || '',
          sender: msg.sender || 'Unknown',
          senderId: msgSenderId,
          timestamp: timestampStr,
          isOwn: msg.isOwn !== undefined ? msg.isOwn : (msgSenderId === currentUserId),
          roomId: msg.roomId,
          recipientId: msg.recipientId,
          read: msg.read !== undefined ? msg.read : false
        }
      }).sort((a: ChatMessage, b: ChatMessage) => {
        // Sort messages by timestamp
        const timeA = new Date(a.timestamp).getTime()
        const timeB = new Date(b.timestamp).getTime()
        return timeA - timeB
      })

      // Validate all messages have required fields
      const validMessages = apiMessages.filter((msg: any) => {
        if (!msg.id || !msg.message) {
          console.warn('⚠️ Invalid message format:', msg)
          return false
        }
        return true
      })

      console.log(`✅ Processed ${validMessages.length} valid messages (${apiMessages.length - validMessages.length} invalid)`)

      // Only update if messages actually changed (to avoid unnecessary re-renders)
      setMessages(prev => {
        const prevIds = new Set(prev.map(m => m.id))
        const newIds = new Set(validMessages.map((m: any) => m.id))
        
        // Check if there are new messages or changes
        const hasNewMessages = validMessages.some((m: any) => !prevIds.has(m.id))
        const hasRemovedMessages = prev.some(m => !newIds.has(m.id))
        const hasChanged = prev.length !== validMessages.length
        
        // Also check if any message content changed
        const hasContentChanges = validMessages.some((newMsg: any) => {
          const oldMsg = prev.find(m => m.id === newMsg.id)
          return oldMsg && (oldMsg.message !== newMsg.message || oldMsg.sender !== newMsg.sender)
        })
        
        if (hasNewMessages || hasRemovedMessages || hasChanged || hasContentChanges) {
          console.log(`🔄 Updating messages: ${prev.length} -> ${validMessages.length}`)
          return validMessages
        }
        return prev
      })

      // Always save ALL messages to localStorage as backup (messages persist in MongoDB, this is just backup)
      // Chat messages are shared and shouldn't be user-scoped
      try {
        const baseKey = CHAT_MESSAGES_KEY
        const existingMessages = JSON.parse(localStorage.getItem(baseKey) || '[]') || []
        const existingIds = new Set(existingMessages.map((m: ChatMessage) => m.id))
        
        // Merge all messages - keep existing ones and add new ones
        const merged = [...existingMessages]
        apiMessages.forEach((newMsg: ChatMessage) => {
          if (!existingIds.has(newMsg.id)) {
            merged.push(newMsg)
          } else {
            // Update existing message if it changed
            const index = merged.findIndex(m => m.id === newMsg.id)
            if (index !== -1) {
              merged[index] = newMsg
            }
          }
        })
        
        // Save all merged messages
        const uniqueMessages = Array.from(
          new Map(merged.map((m: ChatMessage) => [m.id, m])).values()
        )
        localStorage.setItem(baseKey, JSON.stringify(uniqueMessages))
        console.log(`💾 Saved ${uniqueMessages.length} messages to localStorage (backup)`)
      } catch (error) {
        console.error('Error saving messages to localStorage:', error)
      }
    } catch (error: any) {
      console.error('Error fetching messages from API:', error)
      // Fallback to localStorage (not user-scoped)
      try {
        const baseKey = CHAT_MESSAGES_KEY
        const stored = localStorage.getItem(baseKey)
        const fallbackMessages = stored ? JSON.parse(stored) as ChatMessage[] : []
        
        const chatMessages = fallbackMessages
          .filter((msg: ChatMessage) => {
            if (selectedChat.type === 'room') {
              return msg.roomId === selectedChat.id
            } else {
              const chatId = selectedChat.id.split('-')
              return (
                !msg.roomId &&
                ((msg.senderId === chatId[0] && msg.recipientId === chatId[1]) ||
                 (msg.senderId === chatId[1] && msg.recipientId === chatId[0]))
              )
            }
          })
          .sort((a: ChatMessage, b: ChatMessage) => {
            const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime()
            const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime()
            return timeA - timeB
          })
        setMessages(chatMessages)
      } catch (parseError) {
        console.error('Error parsing fallback messages:', parseError)
        setMessages([])
      }
    } finally {
      if (isInitialLoad) {
        setIsLoadingMessages(false)
      }
    }
  }

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChat) {
      // Don't clear messages when no chat selected - keep them in state
      // Clear polling interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
      return
    }

    // Fetch messages immediately from API (messages are persisted in MongoDB)
    fetchMessages()

    // Set up polling for new messages (every 2 seconds)
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }
    pollingIntervalRef.current = setInterval(() => {
      // Always fetch messages when backend is available, regardless of useBackend flag
      fetchMessages().catch(err => {
        console.error('Error in polling fetchMessages:', err)
      })
    }, 2000)

    // Cleanup on unmount or chat change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [selectedChat, user])

  // Message search functionality
  useEffect(() => {
    if (!messageSearchQuery.trim() || !selectedChat) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const query = messageSearchQuery.toLowerCase()
    const results = messages.filter(msg => 
      msg.message.toLowerCase().includes(query) ||
      msg.sender.toLowerCase().includes(query)
    )
    
    setSearchResults(results)
    setShowSearchResults(results.length > 0)
  }, [messageSearchQuery, messages, selectedChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !user) return

    const messageText = newMessage.trim()
    setNewMessage('')

    // Optimistically add message to UI
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      sender: user.name || 'You',
      senderId: user.id,
      message: messageText,
      timestamp: nowISO(),
      isOwn: true,
      read: false,
    }

    if (selectedChat.type === 'room') {
      optimisticMessage.roomId = selectedChat.id
    } else {
      const chatId = selectedChat.id.split('-')
      optimisticMessage.recipientId = chatId[0] === user.id ? chatId[1] : chatId[0]
    }

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage])

    // Always try to send via API first
    try {
      const token = getToken() || 'mock-token-for-testing'
      const payload: any = {
        message: messageText
      }

      if (selectedChat.type === 'room') {
        payload.roomId = selectedChat.id
      } else {
        const chatId = selectedChat.id.split('-')
        const otherUserId = chatId[0] === user.id ? chatId[1] : chatId[0]
        
        if (!otherUserId) {
          console.error('Cannot determine recipient ID from chat ID:', selectedChat.id)
          throw new Error('Invalid chat ID')
        }
        
        payload.recipientId = otherUserId
        console.log(`📤 Sending message to user: ${otherUserId} (from: ${user.id})`)
      }

      console.log(`📤 Sending message via API:`, payload)
      const response = await axios.post(`${API_URL}/chat/send`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log(`✅ Message sent successfully:`, response.data)

      // Replace optimistic message with real one from server
      const realMessage: ChatMessage = {
        ...response.data,
        timestamp: typeof response.data.timestamp === 'string' 
          ? response.data.timestamp 
          : new Date(response.data.timestamp).toISOString(),
        isOwn: true,
        sender: response.data.sender || user.name || 'You',
        senderId: response.data.senderId || user.id
      }
      
      // Replace the optimistic message with the real one
      setMessages(prev => {
        const filtered = prev.filter(msg => msg.id !== optimisticMessage.id)
        return [...filtered, realMessage]
      })

        // Save to localStorage as backup (messages are already in MongoDB, this is just backup)
        try {
          const baseKey = CHAT_MESSAGES_KEY
          const existingMessages = JSON.parse(localStorage.getItem(baseKey) || '[]') || []
          const exists = existingMessages.some((m: ChatMessage) => m.id === realMessage.id)
          if (!exists) {
            const updatedMessages = [...existingMessages, realMessage]
            localStorage.setItem(baseKey, JSON.stringify(updatedMessages))
            console.log(`💾 Saved message to localStorage backup (total: ${updatedMessages.length})`)
          }
        } catch (error) {
          console.error('Error saving message to localStorage:', error)
        }

      // Force refresh messages after a short delay to ensure both users see the message
      setTimeout(() => {
        fetchMessages().catch(err => {
          console.error('Error refreshing messages after send:', err)
        })
      }, 1000)

      setRefreshKey(prev => prev + 1)
    } catch (error: any) {
      console.error('❌ Error sending message via API:', error)
      console.error('Error details:', error.response?.data || error.message)
      
      // Keep the optimistic message but show an error
      alert(`Failed to send message: ${error.response?.data?.error || error.message || 'Unknown error'}`)
      
      // Still save to localStorage as fallback
      try {
        const baseKey = CHAT_MESSAGES_KEY
        const existingMessages = JSON.parse(localStorage.getItem(baseKey) || '[]') || []
        const exists = existingMessages.some((m: ChatMessage) => m.id === optimisticMessage.id)
        if (!exists) {
          localStorage.setItem(baseKey, JSON.stringify([...existingMessages, optimisticMessage]))
        }
      } catch (saveError) {
        console.error('Error saving message to localStorage:', saveError)
      }
      
      setRefreshKey(prev => prev + 1)
    }
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
          {/* Chat List Sidebar - WhatsApp Style */}
          <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
            {/* Room Chats Section */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h3 className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-[0.08em] mb-2 px-2">
                Rooms
              </h3>
              <div className="space-y-0.5 max-h-64 overflow-y-auto">
                {roomChats.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-500 text-center py-3">
                    No rooms
                  </p>
                ) : (
                  roomChats.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedChat({ type: 'room', id: room.id, name: room.name })}
                      className={`w-full text-left p-3 rounded-lg transition-colors relative ${
                        selectedChat?.type === 'room' && selectedChat.id === room.id
                          ? 'bg-green-100 dark:bg-green-900/20'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                          <FaUsers className="text-white text-sm" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            {room.isPrivate ? (
                              <FaLock className="text-gray-500 dark:text-gray-400 text-[10px] flex-shrink-0" />
                            ) : (
                              <FaUnlock className="text-gray-500 dark:text-gray-400 text-[10px] flex-shrink-0" />
                            )}
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                              {room.name}
                            </h4>
                            {room.unreadCount > 0 && (
                              <span className="flex-shrink-0 px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">
                                {room.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                              {room.lastMessage}
                            </p>
                            <span className="text-[11px] text-gray-500 dark:text-gray-500 flex-shrink-0">
                              {(() => {
                                const time = room.lastMessageTime || room.updatedAt
                                const timeStr = typeof time === 'string' ? time : new Date(time).toISOString()
                                return formatTimeAgo(timeStr)
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Direct Chats Section - WhatsApp Style */}
            <div className="p-2 flex-1 overflow-y-auto flex flex-col bg-white dark:bg-gray-800">
              <h3 className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-[0.08em] mb-2 px-2">
                Direct Messages
              </h3>
              
              {/* Search Input */}
              <div className="mb-2 px-2">
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs" />
                  {isSearchingUsers && (
                    <FaSpinner className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs animate-spin" />
                  )}
                  <input
                    type="text"
                    value={dmSearchQuery}
                    onChange={(e) => setDmSearchQuery(e.target.value)}
                    placeholder="Search by name or email…"
                    className="w-full pl-9 pr-9 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:bg-white dark:focus:bg-gray-600 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-0.5 flex-1 overflow-y-auto">
                {/* Existing Direct Chats */}
                {filteredDirectChats.length > 0 && (
                  <>
                    {filteredDirectChats.map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => setSelectedChat({ type: 'direct', id: chat.id, name: chat.userName })}
                        className={`w-full text-left p-3 rounded-lg transition-colors relative ${
                          selectedChat?.type === 'direct' && selectedChat.id === chat.id
                            ? 'bg-green-100 dark:bg-green-900/20'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                            {chat.userName ? chat.userName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                                {chat.userName}
                              </h4>
                              {chat.unreadCount && chat.unreadCount > 0 && (
                                <span className="flex-shrink-0 px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">
                                  {chat.unreadCount}
                                </span>
                              )}
                            </div>
                            {chat.lastMessage && (
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                                  {chat.lastMessage}
                                </p>
                                {chat.lastMessageTime && (
                                  <span className="text-[11px] text-gray-500 dark:text-gray-500 flex-shrink-0">
                                    {formatTimeAgo(chat.lastMessageTime)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
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
                      <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-2 px-3">
                        Available users to chat with:
                      </p>
                    )}
                    {filteredUsersForChat.map((userItem) => (
                      <button
                        key={userItem.id}
                        onClick={() => handleStartChat(userItem.id, userItem.name)}
                        className="w-full text-left p-3 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50 flex items-center gap-3"
                      >
                        <div className="w-12 h-12 bg-gray-400 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm">
                          {userItem.name ? userItem.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {userItem.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {userItem.email}
                          </p>
                        </div>
                        <FaPlus className="text-green-500 dark:text-green-400 text-sm flex-shrink-0" />
                      </button>
                    ))}
                  </>
                ) : filteredDirectChats.length === 0 ? (
                  <div className="text-center py-3">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {dmSearchQuery.trim() 
                        ? `No users found matching "${dmSearchQuery.trim()}"` 
                        : 'No users available'}
                    </p>
                    {dmSearchQuery.trim() && dmSearchQuery.includes('@') && (
                      <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">
                        Make sure the user exists in the system
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <div className="flex flex-1 overflow-hidden">
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Chat Header - WhatsApp Style */}
                  <div className="px-4 py-3 bg-green-600 dark:bg-green-700 border-b border-green-700 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectedChat.type === 'room' ? (
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                          <FaUsers className="text-white text-sm" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                          <FaUser className="text-white text-sm" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-base font-semibold text-white">
                          {selectedChat.name}
                        </h2>
                        <p className="text-xs text-green-100">
                          {selectedChat.type === 'room' ? 'Group' : 'Online'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete this conversation? This action cannot be undone.\n\nهل أنت متأكد من حذف هذه المحادثة؟ لا يمكن التراجع عن هذا الإجراء.`)) {
                              handleDeleteChat()
                            }
                          }}
                          className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
                          title="Delete Conversation (Admin Only)"
                        >
                          <FaTrash className="text-sm" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Message Search - WhatsApp Style */}
                  {messageSearchQuery && (
                    <div className="px-4 py-2 bg-green-600 dark:bg-green-700 border-b border-green-700 dark:border-green-800">
                      <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-100 text-sm" />
                        <input
                          type="text"
                          value={messageSearchQuery}
                          onChange={(e) => setMessageSearchQuery(e.target.value)}
                          placeholder="Search messages..."
                          className="w-full pl-10 pr-10 py-2 bg-white/20 text-white placeholder-green-100 rounded-lg focus:ring-2 focus:ring-white/50 focus:outline-none transition-all text-sm"
                        />
                        <button
                          onClick={() => {
                            setMessageSearchQuery('')
                            setShowSearchResults(false)
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-100 hover:text-white"
                        >
                          <FaTimes className="text-sm" />
                        </button>
                      </div>
                      {showSearchResults && (
                        <div className="mt-2 text-xs text-green-100">
                          Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  )}
                  </div>

                {/* Messages - WhatsApp Style */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'grid\' width=\'100\' height=\'100\' patternUnits=\'userSpaceOnUse\'%3E%3Cpath d=\'M 100 0 L 0 0 0 100\' fill=\'none\' stroke=\'%23e5e7eb\' stroke-width=\'0.5\' opacity=\'0.3\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'100\' height=\'100\' fill=\'url(%23grid)\'/%3E%3C/svg%3E")' }}>
                  {isLoadingMessages ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      <p>Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <FaComments className="text-4xl mb-3 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {messages.map((msg, index) => {
                        const isSearchMatch = messageSearchQuery.trim() && (
                          msg.message.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
                          msg.sender.toLowerCase().includes(messageSearchQuery.toLowerCase())
                        )
                        
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
                            className={`flex gap-2 px-2 py-0.5 ${msg.isOwn ? 'justify-end' : 'justify-start'} ${
                              isSearchMatch ? 'bg-yellow-100 dark:bg-yellow-900/30 rounded' : ''
                            }`}
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
                              {/* Sender name - always show for received messages, show "You" for own messages */}
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
                                {messageSearchQuery.trim() ? (
                                  <span dangerouslySetInnerHTML={{
                                    __html: msg.message.replace(
                                      new RegExp(`(${messageSearchQuery})`, 'gi'),
                                      '<mark class="bg-yellow-300 dark:bg-yellow-600">$1</mark>'
                                    )
                                  }} />
                                ) : (
                                  <span className="text-sm whitespace-pre-wrap break-words">{msg.message}</span>
                                )}
                                
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

                {/* AI Features */}
                {showAIFeatures && (
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <FaLightbulb className="text-yellow-500 text-sm" />
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">AI Features</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={async () => {
                          if (messages.length === 0) return
                          const lastMessage = messages[messages.length - 1]
                          if (lastMessage.isOwn) return
                          
                          setIsLoadingSuggestions(true)
                          try {
                            const token = getToken() || 'mock-token-for-testing'
                            const response = await axios.post(`${API_URL}/chat/ai-suggestions`, {
                              message: lastMessage.message,
                              context: selectedChat.type === 'room' ? 'Room chat' : 'Direct message'
                            }, {
                              headers: { Authorization: `Bearer ${token}` }
                            })
                            setAiSuggestions(response.data.suggestions || [])
                          } catch (error) {
                            console.error('Error getting AI suggestions:', error)
                          } finally {
                            setIsLoadingSuggestions(false)
                          }
                        }}
                        disabled={messages.length === 0 || messages[messages.length - 1]?.isOwn || isLoadingSuggestions}
                        className="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {isLoadingSuggestions ? <FaSpinner className="animate-spin" /> : <FaLightbulb />}
                        Reply Suggestions
                      </button>
                      <button
                        onClick={async () => {
                          if (messages.length === 0) return
                          setIsLoadingSummary(true)
                          try {
                            const token = getToken() || 'mock-token-for-testing'
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
                          } finally {
                            setIsLoadingSummary(false)
                          }
                        }}
                        disabled={messages.length === 0 || isLoadingSummary}
                        className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {isLoadingSummary ? <FaSpinner className="animate-spin" /> : <FaFileAlt />}
                        Summarize
                      </button>
                    </div>
                    {aiSuggestions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {aiSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setNewMessage(suggestion)
                              setAiSuggestions([])
                            }}
                            className="w-full text-left text-xs px-2 py-1.5 bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-800 rounded text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Conversation Summary Modal */}
                {showSummary && conversationSummary && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FaFileAlt className="text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Conversation Summary</span>
                      </div>
                      <button
                        onClick={() => {
                          setShowSummary(false)
                          setConversationSummary('')
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <FaTimes />
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {conversationSummary}
                    </p>
                  </div>
                )}

                {/* Input Area - WhatsApp Style */}
                <div className="p-3 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-end gap-2 mb-2">
                    <button
                      onClick={() => setShowAIFeatures(!showAIFeatures)}
                      className={`p-2 rounded-full transition-colors ${
                        showAIFeatures 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title="AI Features"
                    >
                      <FaLightbulb className="text-sm" />
                    </button>
                  </div>
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
                      type="button"
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

                {/* Room Members Sidebar - Only show for room chats */}
                {selectedChat.type === 'room' && (
                  <div className="w-64 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                        Members ({roomMembers.length})
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {rooms.find(r => r.id === selectedChat.id)?.members || 0} total
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                      {roomMembers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <FaUsers className="text-3xl mb-2 opacity-50 mx-auto" />
                          <p className="text-xs">No members found</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {roomMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <FaUser className="text-white text-[10px]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {member.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {member.email}
                                </p>
                              </div>
                              {member.role && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
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
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
