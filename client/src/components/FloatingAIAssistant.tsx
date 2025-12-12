import { useState } from 'react'
import { FaRobot, FaTimes } from 'react-icons/fa'
import AIChatbot from './AIChatbot'

const FloatingAIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Robot Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 hover:from-blue-700 hover:via-blue-600 hover:to-green-700 rounded-full shadow-2xl shadow-blue-500/40 hover:shadow-3xl transition-all duration-300 flex items-center justify-center group hover:scale-110 transform ${
          isOpen ? 'rotate-180' : ''
        }`}
        aria-label="AI Assistant"
      >
        {isOpen ? (
          <FaTimes className="text-white text-2xl transition-transform duration-300" />
        ) : (
          <FaRobot className="text-white text-2xl group-hover:scale-110 transition-transform duration-300" />
        )}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>

      {/* AI Chatbot Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chatbot Window */}
          <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] animate-slide-up">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/50 shadow-2xl shadow-blue-500/30 h-full flex flex-col">
              <div className="p-4 border-b border-blue-200/50 dark:border-blue-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                    <FaRobot className="text-white text-lg" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">AI Assistant</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Always here to help</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FaTimes className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <AIChatbot placeholder="Ask me anything..." title="" />
            </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default FloatingAIAssistant

