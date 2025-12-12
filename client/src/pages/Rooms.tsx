import { useState } from 'react'
import { FaPlus, FaUsers, FaLock, FaUnlock, FaVideo, FaSignInAlt, FaRobot, FaMicrophone, FaLanguage } from 'react-icons/fa'

interface Room {
  id: string
  name: string
  description: string
  isPrivate: boolean
  members: number
  maxMembers: number
}

const Rooms = () => {
  const [rooms, setRooms] = useState<Room[]>([
    {
      id: '1',
      name: 'General Discussion',
      description: 'Main room for team discussions',
      isPrivate: false,
      members: 12,
      maxMembers: 50
    },
    {
      id: '2',
      name: 'Project Alpha',
      description: 'Project planning and updates',
      isPrivate: true,
      members: 5,
      maxMembers: 20
    },
    {
      id: '3',
      name: 'Development Team',
      description: 'Technical discussions and code reviews',
      isPrivate: false,
      members: 8,
      maxMembers: 30
    }
  ])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: '', description: '', isPrivate: false })

  const handleCreateRoom = () => {
    if (newRoom.name.trim()) {
      const room: Room = {
        id: Date.now().toString(),
        name: newRoom.name,
        description: newRoom.description,
        isPrivate: newRoom.isPrivate,
        members: 1,
        maxMembers: 50
      }
      setRooms([...rooms, room])
      setNewRoom({ name: '', description: '', isPrivate: false })
      setShowCreateModal(false)
    }
  }

  const handleJoinRoom = (roomId: string) => {
    // Navigate to video room
    window.location.href = `/video/${rooms.find(r => r.id === roomId)?.name || 'room'}`
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white mb-2">
              Rooms
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
              Join rooms or create a new room
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <FaPlus className="text-xs" /> Create Room
          </button>
        </div>

        {/* AI Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* AI Meeting Assistant */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FaRobot className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Meeting Assistant</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Get real-time meeting insights and suggestions</p>
            <div className="space-y-2">
              <div className="p-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                ✓ Auto-generate meeting notes
              </div>
              <div className="p-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                ✓ Action item extraction
              </div>
            </div>
          </div>

          {/* Real-time Speech-to-Text (STT) */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <FaMicrophone className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Speech-to-Text</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Real-time transcription of meetings</p>
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors duration-200">
                Start Recording
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400">Live</span>
            </div>
          </div>

          {/* AI Live Translation */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 rounded-xl flex items-center justify-center">
                <FaLanguage className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Translation</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Real-time multi-language translation</p>
            <select className="w-full px-3 py-2 bg-white dark:bg-gray-700 border-2 border-blue-200/50 dark:border-blue-800/50 rounded-xl text-sm text-gray-900 dark:text-white">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>Arabic</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  {room.isPrivate ? (
                    <FaLock className="text-gray-500 dark:text-gray-400" />
                  ) : (
                    <FaUnlock className="text-gray-500 dark:text-gray-400" />
                  )}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{room.name}</h3>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">{room.description}</p>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <FaUsers />
                  <span>{room.members}/{room.maxMembers}</span>
                </div>
              </div>
                     <button
                       onClick={() => handleJoinRoom(room.id)}
                       className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
                     >
                       <FaSignInAlt className="text-xs" /> Join
                     </button>
            </div>
          ))}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-xl">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Create New Room
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Enter room name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newRoom.description}
                    onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Enter room description"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="private"
                    checked={newRoom.isPrivate}
                    onChange={(e) => setNewRoom({ ...newRoom, isPrivate: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="private" className="text-sm text-gray-700 dark:text-gray-300">
                    Private Room
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateRoom}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-all"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-4 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Rooms

