import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaTimes, FaVideo, FaFile, FaCalendarAlt, FaComments, FaSearch } from 'react-icons/fa'
import { getJSON } from '../data/storage'
import { ROOMS_KEY, FILES_KEY, EVENTS_KEY, CHAT_MESSAGES_KEY } from '../data/keys'
import { Room, FileItem, EventItem, ChatMessage } from '../types/models'

interface SearchResult {
  id: string
  title: string
  type: 'room' | 'file' | 'event' | 'message'
  path: string
  metadata?: string
}

interface SearchResultsModalProps {
  isOpen: boolean
  onClose: () => void
  searchQuery: string
}

const typeConfig = {
  room: { icon: FaVideo, label: 'Rooms', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  file: { icon: FaFile, label: 'Files', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  event: { icon: FaCalendarAlt, label: 'Events', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  message: { icon: FaComments, label: 'Messages', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
}

export default function SearchResultsModal({ isOpen, onClose, searchQuery }: SearchResultsModalProps) {
  const navigate = useNavigate()
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([])

  // Get all searchable items from storage
  const allSearchResults = useMemo(() => {
    const rooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    const files = getJSON<FileItem[]>(FILES_KEY, []) || []
    const events = getJSON<EventItem[]>(EVENTS_KEY, []) || []
    const messages = getJSON<ChatMessage[]>(CHAT_MESSAGES_KEY, []) || []

    const results: SearchResult[] = [
      // Rooms
      ...rooms.map(room => ({
        id: room.id,
        title: room.name,
        type: 'room' as const,
        path: `/rooms/${room.id}`,
        metadata: `${room.description || 'Room'} • ${room.members || 0} members`
      })),
      // Files
      ...files.filter(f => !f.isTrashed).map(file => ({
        id: file.id,
        title: file.name,
        type: 'file' as const,
        path: '/files',
        metadata: `${file.type || 'File'} • ${(file.size / 1024).toFixed(1)} KB • ${new Date(file.uploadedAt).toLocaleDateString()}`
      })),
      // Events
      ...events.map(event => {
        const eventDate = typeof event.date === 'string' ? new Date(event.date) : event.date
        return {
          id: event.id,
          title: event.title,
          type: 'event' as const,
          path: '/calendar',
          metadata: `${eventDate.toLocaleDateString()} • ${event.time || ''}`
        }
      }),
      // Messages (recent messages only)
      ...messages.slice(-50).map(msg => ({
        id: msg.id,
        title: msg.message.substring(0, 50) + (msg.message.length > 50 ? '...' : ''),
        type: 'message' as const,
        path: msg.roomId ? `/rooms/${msg.roomId}` : '/chat',
        metadata: `From: ${msg.sender || 'User'} • ${new Date(msg.timestamp).toLocaleDateString()}`
      }))
    ]

    return results
  }, [])

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = allSearchResults.filter(result =>
        result.title.toLowerCase().includes(query) ||
        result.metadata?.toLowerCase().includes(query)
      )
      setFilteredResults(filtered)
    } else {
      setFilteredResults(allSearchResults.slice(0, 20)) // Show first 20 when no query
    }
  }, [searchQuery, allSearchResults])

  // Group results by type
  const groupedResults = filteredResults.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  const handleResultClick = (result: SearchResult) => {
    navigate(result.path)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FaSearch className="text-blue-600 dark:text-blue-400 text-xl" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Search Results
              </h2>
              {searchQuery && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredResults.length === 0 ? (
            <div className="text-center py-16">
              <FaSearch className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No results found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try a different search term
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedResults).map(([type, results]) => {
                const config = typeConfig[type as keyof typeof typeConfig]
                const Icon = config.icon
                
                return (
                  <div key={type}>
                    {/* Section Header */}
                    <div className={`flex items-center gap-3 mb-4 p-3 rounded-lg ${config.bgColor}`}>
                      <Icon className={`${config.color} text-xl`} />
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {config.label}
                      </h3>
                      <span className="ml-auto px-2 py-1 bg-white dark:bg-gray-700 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300">
                        {results.length}
                      </span>
                    </div>
                    
                    {/* Results Grid */}
                    <div className="grid md:grid-cols-2 gap-3">
                      {results.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all text-left group"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-1 ${config.color}`}>
                              <Icon className="text-lg" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
                                {result.title}
                              </div>
                              {result.metadata && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {result.metadata}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


