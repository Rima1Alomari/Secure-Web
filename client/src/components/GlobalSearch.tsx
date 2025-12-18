import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaSearch, FaVideo, FaFile, FaCalendarAlt, FaComments, FaTimes, FaRobot, FaSpinner } from 'react-icons/fa'
import SearchResultsModal from './SearchResultsModal'
import { getJSON } from '../data/storage'
import { ROOMS_KEY, FILES_KEY, EVENTS_KEY, CHAT_MESSAGES_KEY } from '../data/keys'

interface SearchResult {
  id: string
  title: string
  type: 'room' | 'file' | 'event' | 'message'
  path: string
  metadata?: string
}

const typeConfig = {
  room: { icon: FaVideo, label: 'Rooms', color: 'text-blue-600 dark:text-blue-400' },
  file: { icon: FaFile, label: 'Files', color: 'text-green-600 dark:text-green-400' },
  event: { icon: FaCalendarAlt, label: 'Events', color: 'text-purple-600 dark:text-purple-400' },
  message: { icon: FaComments, label: 'Messages', color: 'text-orange-600 dark:text-orange-400' },
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([])
  const [isAISearch, setIsAISearch] = useState(false)
  const [aiSearching, setAiSearching] = useState(false)
  const navigate = useNavigate()
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Get all searchable items from storage
  const getAllSearchableItems = (): SearchResult[] => {
    const rooms = getJSON<any[]>(ROOMS_KEY, []) || []
    const files = getJSON<any[]>(FILES_KEY, []) || []
    const events = getJSON<any[]>(EVENTS_KEY, []) || []
    const messages = getJSON<any[]>(CHAT_MESSAGES_KEY, []) || []

    const results: SearchResult[] = [
      ...rooms.map(room => ({
        id: room.id,
        title: room.name,
        type: 'room' as const,
        path: `/rooms/${room.id}`,
        metadata: room.description || 'Room'
      })),
      ...files.map(file => ({
        id: file.id,
        title: file.name,
        type: 'file' as const,
        path: '/files',
        metadata: `${file.type || 'File'} • ${(file.size / 1024).toFixed(1)} KB`
      })),
      ...events.map(event => ({
        id: event.id,
        title: event.title,
        type: 'event' as const,
        path: '/calendar',
        metadata: `${event.date} • ${event.time || ''}`
      })),
      ...messages.slice(0, 20).map(msg => ({
        id: msg.id,
        title: msg.message?.substring(0, 50) || 'Message',
        type: 'message' as const,
        path: `/rooms/${msg.roomId}`,
        metadata: `From: ${msg.sender || 'User'}`
      }))
    ]

    return results
  }

  // AI-powered smart search
  const performAISearch = async (query: string) => {
    if (!query.trim() || query.length < 3) return

    setAiSearching(true)
    try {
      const allItems = getAllSearchableItems()
      const API_URL = (import.meta as any).env.VITE_API_URL || '/api'
      const token = localStorage.getItem('token') || 'mock-token-for-testing'

      const response = await fetch(`${API_URL}/ai/smart-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query,
          items: allItems.map(item => ({
            title: item.title,
            metadata: item.metadata,
            type: item.type
          }))
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Map back to full SearchResult objects
        const matchedItems = allItems.filter(item =>
          data.items?.some((matched: any) => matched.title === item.title)
        )
        setFilteredResults(matchedItems.length > 0 ? matchedItems : allItems.slice(0, 10))
        setIsAISearch(true)
      } else {
        // Fallback to regular search
        performRegularSearch(query)
      }
    } catch (error) {
      console.error('AI search error:', error)
      // Fallback to regular search
      performRegularSearch(query)
    } finally {
      setAiSearching(false)
    }
  }

  // Regular keyword search
  const performRegularSearch = (query: string) => {
    const allItems = getAllSearchableItems()
    const queryLower = query.toLowerCase()
    const filtered = allItems.filter(result =>
      result.title.toLowerCase().includes(queryLower) ||
      result.metadata?.toLowerCase().includes(queryLower)
    )
    setFilteredResults(filtered)
    setIsAISearch(false)
  }

  // Filter results based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      // Use AI search for longer, more natural language queries
      if (searchQuery.length > 10 && searchQuery.split(' ').length > 2) {
        performAISearch(searchQuery)
      } else {
        performRegularSearch(searchQuery)
      }
    } else {
      setFilteredResults([])
      setIsAISearch(false)
    }
  }, [searchQuery])

  // Group results by type
  const groupedResults = filteredResults.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowModal(true)
      setIsOpen(false)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setShowModal(false)
      setSearchQuery('')
    }
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    navigate(result.path)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl mx-2 sm:mx-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.trim()) {
              setIsOpen(true)
            }
          }}
          placeholder="Search rooms, files, events... (AI-powered)"
          className="block w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-xs sm:text-sm"
        />
        {aiSearching && (
          <div className="absolute inset-y-0 right-0 pr-10 flex items-center">
            <FaSpinner className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
        )}
        {isAISearch && !aiSearching && (
          <div className="absolute inset-y-0 right-0 pr-10 flex items-center">
            <FaRobot className="h-4 w-4 text-green-600 dark:text-green-400" title="AI-powered search" />
          </div>
        )}
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('')
              setIsOpen(false)
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <FaTimes className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && filteredResults.length > 0 && (
        <div className="absolute z-50 mt-2 w-full sm:w-[calc(100vw-2rem)] lg:w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto animate-fade-in">
          {isAISearch && (
            <div className="px-3 py-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center gap-2">
              <FaRobot className="text-green-600 dark:text-green-400 text-sm" />
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                AI-powered search results
              </span>
            </div>
          )}
          <div className="p-2">
            {Object.entries(groupedResults).map(([type, results]) => {
              const config = typeConfig[type as keyof typeof typeConfig]
              const Icon = config.icon
              
              return (
                <div key={type} className="mb-4 last:mb-0">
                  {/* Group Header */}
                  <div className="flex items-center gap-2 px-3 py-2 mb-1">
                    <Icon className={`${config.color} text-sm`} />
                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {config.label}
                    </h3>
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                      {results.length}
                    </span>
                  </div>
                  
                  {/* Results List */}
                  <div className="space-y-1">
                    {results.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full px-3 py-2.5 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-150 group"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${config.color}`}>
                            <Icon className="text-sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {result.title}
                            </div>
                            {result.metadata && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
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
        </div>
      )}

      {/* Empty State */}
      {isOpen && filteredResults.length === 0 && searchQuery.trim() && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center animate-fade-in">
          <FaSearch className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No results found for "{searchQuery}"
          </p>
        </div>
      )}

      {/* Search Results Modal */}
      <SearchResultsModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSearchQuery('')
        }}
        searchQuery={searchQuery}
      />
    </div>
  )
}

