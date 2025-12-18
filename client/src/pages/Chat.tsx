import { useState, useRef, useEffect, useMemo } from 'react'
import { FaPaperPlane, FaUser, FaComments, FaUsers, FaLock, FaUnlock, FaSearch, FaPlus, FaTimes } from 'react-icons/fa'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { ROOMS_KEY, CHAT_MESSAGES_KEY, ADMIN_USERS_KEY } from '../data/keys'
import { Room, ChatMessage, DirectChat, AdminUserMock } from '../types/models'
import { useUser } from '../contexts/UserContext'

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

  // Get rooms
  const rooms = useMemo(() => {
    return getJSON<Room[]>(ROOMS_KEY, []) || []
  }, [refreshKey])

  // Get all messages
  const allMessages = useMemo(() => {
    return getJSON<ChatMessage[]>(CHAT_MESSAGES_KEY, []) || []
  }, [refreshKey])

  // Get all users for search
  const allUsers = useMemo(() => {
    return getJSON<AdminUserMock[]>(ADMIN_USERS_KEY, []) || []
  }, [])

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
    const availableUsers = allUsers.filter(u => 
      u.id !== user?.id && !existingChatUserIds.has(u.id)
    )
    
    // If searching, filter by query; otherwise show all available users
    if (query) {
      return availableUsers
        .filter(u => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query))
        .slice(0, 10)
    } else {
      // Show all available users (limit to 20 for performance)
      return availableUsers.slice(0, 20)
    }
  }, [allUsers, dmSearchQuery, directChats, user?.id])

  const handleStartChat = (targetUserId: string, targetUserName: string) => {
    if (!user?.id) return
    
    const chatId = [user.id, targetUserId].sort().join('-')
    setSelectedChat({ type: 'direct', id: chatId, name: targetUserName })
    setDmSearchQuery('')
  }

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedChat) {
      setMessages([])
      return
    }

    const chatMessages = allMessages
      .filter(msg => {
        if (selectedChat.type === 'room') {
          return msg.roomId === selectedChat.id
        } else {
          // Direct chat: message is between current user and the other user
          const chatId = selectedChat.id.split('-')
          return (
            !msg.roomId &&
            ((msg.senderId === chatId[0] && msg.recipientId === chatId[1]) ||
             (msg.senderId === chatId[1] && msg.recipientId === chatId[0]))
          )
        }
      })
      .sort((a, b) => {
        const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp.getTime()
        const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp.getTime()
        return timeA - timeB
      })

    setMessages(chatMessages)
  }, [selectedChat, allMessages])

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

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat || !user) return

    const message: ChatMessage = {
      id: uuid(),
      sender: user.name || 'You',
      senderId: user.id,
      message: newMessage,
      timestamp: nowISO(),
      isOwn: true,
      read: false,
    }

    if (selectedChat.type === 'room') {
      message.roomId = selectedChat.id
    } else {
      // Direct chat: set recipient to the other user
      const chatId = selectedChat.id.split('-')
      message.recipientId = chatId[0] === user.id ? chatId[1] : chatId[0]
    }

    const allMessages = getJSON<ChatMessage[]>(CHAT_MESSAGES_KEY, []) || []
    setJSON(CHAT_MESSAGES_KEY, [...allMessages, message])
    setMessages([...messages, message])
    setNewMessage('')
    setRefreshKey(prev => prev + 1)
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
                ) : filteredDirectChats.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-500 text-center py-3">
                    {dmSearchQuery.trim() ? 'No users found' : 'No users available'}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    {selectedChat.type === 'room' ? (
                      <FaUsers className="text-blue-600 dark:text-blue-400" />
                    ) : (
                      <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                        <FaUser className="text-white text-sm" />
                      </div>
                    )}
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedChat.name}
                    </h2>
                  </div>
                  
                  {/* Message Search */}
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="text"
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      placeholder="Search messages..."
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                    />
                    {messageSearchQuery && (
                      <button
                        onClick={() => {
                          setMessageSearchQuery('')
                          setShowSearchResults(false)
                        }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    )}
                  </div>
                  
                  {showSearchResults && (
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <FaComments className="text-4xl mb-3 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isSearchMatch = messageSearchQuery.trim() && (
                        msg.message.toLowerCase().includes(messageSearchQuery.toLowerCase()) ||
                        msg.sender.toLowerCase().includes(messageSearchQuery.toLowerCase())
                      )
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${msg.isOwn ? 'flex-row-reverse' : ''} ${
                            isSearchMatch ? 'bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 -m-2' : ''
                          }`}
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
                              {messageSearchQuery.trim() ? (
                                <span dangerouslySetInnerHTML={{
                                  __html: msg.message.replace(
                                    new RegExp(`(${messageSearchQuery})`, 'gi'),
                                    '<mark class="bg-yellow-300 dark:bg-yellow-600">$1</mark>'
                                  )
                                }} />
                              ) : (
                                msg.message
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-5 py-3.5 bg-white dark:bg-gray-700 border-2 border-blue-200/50 dark:border-blue-800/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm shadow-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="btn-primary"
                    >
                      <FaPaperPlane /> Send
                    </button>
                  </div>
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
