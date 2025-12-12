import { useState, useRef, useEffect } from 'react'
import { FaRobot, FaPaperPlane, FaSpinner } from 'react-icons/fa'

interface Message {
  id: string
  text: string
  isBot: boolean
  timestamp: Date
}

interface AIChatbotProps {
  placeholder?: string
  title?: string
}

const AIChatbot = ({ placeholder = "Ask me anything...", title = "AI Assistant" }: AIChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI assistant. How can I help you today?',
      isBot: true,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isBot: false,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setIsTyping(true)

    try {
      // Get conversation history for context
      const conversationHistory = messages.map(msg => ({
        text: msg.text,
        isBot: msg.isBot
      }))

      console.log('Sending message to AI:', currentInput)
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'mock-token-for-testing'}`
        },
        body: JSON.stringify({
          message: currentInput,
          conversationHistory: conversationHistory
        })
      })

      console.log('Response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        console.error('API Error:', errorData)
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('AI Response received:', data)
      
      if (!data.response) {
        throw new Error('No response from AI service')
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isBot: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error: any) {
      console.error('AI Chat error details:', error)
      
      // More specific error handling
      let errorMessage = 'Unknown error occurred'
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to server. Please make sure the server is running on port 5000.'
      } else if (error.message) {
        errorMessage = error.message
      } else if (error.toString && error.toString() !== '[object Object]') {
        errorMessage = error.toString()
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I encountered an error: ${errorMessage}. Please check the browser console (F12) for more details.`,
        isBot: true,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="bg-transparent flex flex-col h-full">
      {title && (
        <div className="p-4 border-b border-blue-200/50 dark:border-blue-800/50 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
            <FaRobot className="text-white text-lg" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">AI-powered assistant</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.isBot ? '' : 'flex-row-reverse'}`}
          >
            <div className={`flex-1 ${msg.isBot ? '' : 'text-right'}`}>
              <div
                className={`inline-block px-4 py-2 rounded-xl ${
                  msg.isBot
                    ? 'bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 text-gray-900 dark:text-white border border-blue-200/50 dark:border-blue-800/50'
                    : 'bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-500 dark:to-green-500 text-white'
                }`}
              >
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3">
            <div className="flex-1">
              <div className="inline-block px-4 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200/50 dark:border-blue-800/50">
                <FaSpinner className="animate-spin text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-blue-200/50 dark:border-blue-800/50 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={placeholder}
            className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border-2 border-blue-200/50 dark:border-blue-800/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
          <button
            onClick={handleSend}
            disabled={isTyping}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:scale-105 disabled:opacity-50"
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  )
}

export default AIChatbot

