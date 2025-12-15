import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaTimes, FaVideo, FaFile, FaCalendarAlt, FaComments, FaSearch } from 'react-icons/fa'

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

// Mock search results
const mockResults: SearchResult[] = [
  // Rooms
  { id: '1', title: 'Team Standup Meeting', type: 'room', path: '/rooms', metadata: 'Daily sync • 5 members' },
  { id: '2', title: 'Project Planning Room', type: 'room', path: '/rooms', metadata: 'Active now • 12 members' },
  { id: '3', title: 'Client Presentation', type: 'room', path: '/rooms', metadata: 'Scheduled • 8 members' },
  { id: '4', title: 'Development Team', type: 'room', path: '/rooms', metadata: 'Active now • 15 members' },
  
  // Files
  { id: '5', title: 'Q4_Report_2024.pdf', type: 'file', path: '/files', metadata: 'PDF • 2.3 MB • Dec 10, 2024' },
  { id: '6', title: 'Project_Proposal.docx', type: 'file', path: '/files', metadata: 'Word • 456 KB • Dec 8, 2024' },
  { id: '7', title: 'Meeting_Notes_2024.xlsx', type: 'file', path: '/files', metadata: 'Excel • 1.1 MB • Dec 5, 2024' },
  { id: '8', title: 'Design_Mockups.zip', type: 'file', path: '/files', metadata: 'Archive • 15.2 MB • Dec 1, 2024' },
  { id: '9', title: 'Budget_2024.xlsx', type: 'file', path: '/files', metadata: 'Excel • 256 KB • Nov 28, 2024' },
  
  // Events (Calendar)
  { id: '10', title: 'Quarterly Review Meeting', type: 'event', path: '/calendar', metadata: 'Dec 15, 2024 • 2:00 PM' },
  { id: '11', title: 'Team Building Event', type: 'event', path: '/calendar', metadata: 'Dec 20, 2024 • 10:00 AM' },
  { id: '12', title: 'Product Launch', type: 'event', path: '/calendar', metadata: 'Jan 5, 2025 • 9:00 AM' },
  { id: '13', title: 'Sprint Planning', type: 'event', path: '/calendar', metadata: 'Dec 18, 2024 • 3:00 PM' },
  
  // Messages (Chat)
  { id: '14', title: 'Discussion about new features', type: 'message', path: '/chat', metadata: 'From: John Doe • 2 hours ago' },
  { id: '15', title: 'Security update notification', type: 'message', path: '/chat', metadata: 'From: Admin • Yesterday' },
  { id: '16', title: 'Project status update', type: 'message', path: '/chat', metadata: 'From: Sarah • 3 days ago' },
]

const typeConfig = {
  room: { icon: FaVideo, label: 'Rooms', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  file: { icon: FaFile, label: 'Files', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  event: { icon: FaCalendarAlt, label: 'Events', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  message: { icon: FaComments, label: 'Messages', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
}

export default function SearchResultsModal({ isOpen, onClose, searchQuery }: SearchResultsModalProps) {
  const navigate = useNavigate()
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([])

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = mockResults.filter(result =>
        result.title.toLowerCase().includes(query) ||
        result.metadata?.toLowerCase().includes(query)
      )
      setFilteredResults(filtered)
    } else {
      setFilteredResults(mockResults)
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


