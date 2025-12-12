import { useState, useRef, useEffect } from 'react'
import { FaPaperPlane, FaUser, FaLightbulb } from 'react-icons/fa'

interface Message {
  id: string
  sender: string
  message: string
  timestamp: Date
  isOwn: boolean
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'John Doe',
      message: 'Hello everyone! How is the project going?',
      timestamp: new Date(Date.now() - 3600000),
      isOwn: false
    },
    {
      id: '2',
      sender: 'You',
      message: 'Everything is on track! We should have a demo ready by next week.',
      timestamp: new Date(Date.now() - 3300000),
      isOwn: true
    },
    {
      id: '3',
      sender: 'Jane Smith',
      message: 'Great! Looking forward to seeing it.',
      timestamp: new Date(Date.now() - 3000000),
      isOwn: false
    }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        sender: 'You',
        message: newMessage,
        timestamp: new Date(),
        isOwn: true
      }
      setMessages([...messages, message])
      setNewMessage('')
      setAiSuggestions([])
      
      // Simulate AI auto-reply suggestions
      setTimeout(() => {
        setAiSuggestions([
          "Thanks for the update!",
          "I'll follow up on that.",
          "Sounds good to me!"
        ])
      }, 500)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setNewMessage(suggestion)
    setAiSuggestions([])
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white mb-2">
              Chat
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
              Communicate with your team in real-time
            </p>
        </div>

        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 flex flex-col" style={{ height: 'calc(100vh - 250px)' }}>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.isOwn ? 'flex-row-reverse' : ''}`}
              >
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                  <FaUser className="text-white" />
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
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {/* AI Auto-Reply Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <FaLightbulb className="text-yellow-500" />
                  <span className="font-semibold">AI Suggestions:</span>
                </div>
                {aiSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 hover:from-blue-100 hover:to-green-100 dark:hover:from-blue-900/30 dark:hover:to-green-900/30 border border-blue-200/50 dark:border-blue-800/50 rounded-lg text-xs text-gray-700 dark:text-gray-300 font-medium transition-all hover:scale-105"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
              />
              <button
                onClick={handleSendMessage}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 text-sm"
              >
                <FaPaperPlane className="text-xs" /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat

