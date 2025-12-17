import { useState, useRef, useEffect, useMemo } from 'react'
import { FaPaperPlane, FaUser, FaComments, FaUsers, FaLock, FaUnlock, FaRobot, FaSpinner, FaMagic } from 'react-icons/fa'
import axios from 'axios'
import { getToken } from '../utils/auth'
import Modal from '../components/common/Modal'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { ROOMS_KEY, CHAT_MESSAGES_KEY } from '../data/keys'
import { Room, ChatMessage, DirectChat } from '../types/models'
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
  
  // AI features state
  const [showAiReplies, setShowAiReplies] = useState(false)
  const [aiReplySuggestions, setAiReplySuggestions] = useState<string[]>([])
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false)

  // Get rooms
  const rooms = useMemo(() => {
    return getJSON<Room[]>(ROOMS_KEY, []) || []
  }, [refreshKey])

  // Get all messages
  const allMessages = useMemo(() => {
    return getJSON<ChatMessage[]>(CHAT_MESSAGES_KEY, []) || []
  }, [refreshKey])

  // Get direct chats (simple implementation)
  const directChats = useMemo(() => {
    if (!user?.id) return []
    
    const chats: DirectChat[] = []
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

  // AI Reply Suggestions
  const getAIReplySuggestions = async () => {
    if (!selectedChat || messages.length === 0) {
      return
    }
    
    setShowAiReplies(true)
    setAiReplySuggestions([])
    setIsGeneratingReplies(true)
    
    try {
      const token = getToken() || 'mock-token-for-testing'
      const lastMessage = messages[messages.length - 1]
      const context = `Chat: ${selectedChat.name}, Last message: ${lastMessage.message}`
      
      const response = await axios.post(
        '/api/ai/auto-reply',
        { message: lastMessage.message, context },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setAiReplySuggestions(response.data.suggestions || [])
    } catch (error: any) {
      console.error('AI reply suggestions error:', error)
      setAiReplySuggestions([])
    } finally {
      setIsGeneratingReplies(false)
    }
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
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-3">
                Rooms
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {roomChats.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-4">
                    No rooms
                  </p>
                ) : (
                  roomChats.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedChat({ type: 'room', id: room.id, name: room.name })}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        selectedChat?.type === 'room' && selectedChat.id === room.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {room.isPrivate ? (
                          <FaLock className="text-gray-500 dark:text-gray-400 text-xs flex-shrink-0" />
                        ) : (
                          <FaUnlock className="text-gray-500 dark:text-gray-400 text-xs flex-shrink-0" />
                        )}
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate flex-1">
                          {room.name}
                        </h4>
                        {room.unreadCount > 0 && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {room.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                        {room.lastMessage}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                        {formatTimeAgo(room.lastMessageTime || room.updatedAt)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Direct Chats Section */}
            <div className="p-4 flex-1 overflow-y-auto">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-400 uppercase tracking-wide mb-3">
                Direct Messages
              </h3>
              <div className="space-y-2">
                {directChats.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-4">
                    No direct messages
                  </p>
                ) : (
                  directChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat({ type: 'direct', id: chat.id, name: chat.userName })}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        selectedChat?.type === 'direct' && selectedChat.id === chat.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <FaUser className="text-white text-xs" />
                        </div>
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate flex-1">
                          {chat.userName}
                        </h4>
                        {chat.unreadCount && chat.unreadCount > 0 && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                      {chat.lastMessage && (
                        <>
                          <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                            {chat.lastMessage}
                          </p>
                          {chat.lastMessageTime && (
                            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                              {formatTimeAgo(chat.lastMessageTime)}
                            </p>
                          )}
                        </>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
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
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <FaComments className="text-4xl mb-3 opacity-50" />
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
                      onClick={getAIReplySuggestions}
                      disabled={!selectedChat || messages.length === 0 || isGeneratingReplies}
                      className="px-3 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Get AI reply suggestions"
                    >
                      <FaMagic />
                    </button>
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

        {/* AI Reply Suggestions Modal */}
        <Modal
          isOpen={showAiReplies}
          onClose={() => {
            setShowAiReplies(false)
            setAiReplySuggestions([])
          }}
          title="AI Reply Suggestions"
        >
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <FaRobot className="inline mr-2 text-purple-500" />
                AI-generated reply suggestions:
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 max-h-96 overflow-y-auto">
              {isGeneratingReplies ? (
                <div className="flex items-center justify-center py-8">
                  <FaSpinner className="animate-spin text-purple-600 dark:text-purple-400 text-2xl" />
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Generating suggestions...</span>
                </div>
              ) : aiReplySuggestions.length > 0 ? (
                <div className="space-y-2">
                  {aiReplySuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setNewMessage(suggestion)
                        setShowAiReplies(false)
                        setAiReplySuggestions([])
                      }}
                      className="w-full text-left p-3 bg-gray-50 dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No suggestions available
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAiReplies(false)
                  setAiReplySuggestions([])
                }}
                className="btn-secondary flex-1"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}

export default Chat
