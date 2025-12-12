import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { FaVideo, FaFile, FaSignOutAlt, FaUsers, FaShieldAlt, FaCloud, FaRocket, FaChartLine, FaArrowRight } from 'react-icons/fa'
import { removeToken, getToken } from '../utils/auth'

const Dashboard = () => {
  const navigate = useNavigate()
  const [channelName, setChannelName] = useState('')

  const handleLogout = () => {
    removeToken()
    navigate('/login')
  }

  const handleJoinVideo = (e: React.FormEvent) => {
    e.preventDefault()
    if (channelName.trim()) {
      navigate(`/video/${channelName.trim()}`)
    } else {
      alert('Please enter a channel name')
    }
  }

  const handleOpenFiles = () => {
    navigate('/files')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-lg border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                <FaShieldAlt className="text-white text-xl" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Secure Web
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-blue-500 to-green-600 bg-clip-text text-transparent">
            Welcome to Secure Web
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your unified platform for professional video conferencing and secure file management
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {/* Video Conferencing Card */}
          <div className="group bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-blue-100 hover:border-blue-300 transform hover:scale-[1.02]">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <FaVideo className="text-white text-3xl" />
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-4">Video Conferencing</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Join or create high-quality video meetings with real-time audio, video, and screen sharing capabilities. 
              Perfect for team collaboration and remote work.
            </p>
            <form onSubmit={handleJoinVideo} className="space-y-4">
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Enter channel name"
                className="w-full px-5 py-3.5 bg-blue-50 border-2 border-blue-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/50 transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                Join Video Room <FaArrowRight />
              </button>
            </form>
          </div>

          {/* File Manager Card */}
          <div className="group bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-green-100 hover:border-green-300 transform hover:scale-[1.02]">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
              <FaFile className="text-white text-3xl" />
            </div>
            <h3 className="text-3xl font-bold text-gray-800 mb-4">File Manager</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Upload, manage, and share your files securely. Collaborate on documents with real-time editing. 
              All files are encrypted and stored safely in the cloud.
            </p>
            <button
              onClick={handleOpenFiles}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/50 transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              Open File Manager <FaArrowRight />
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-xl p-6 border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 group shadow-md hover:shadow-lg">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-4 group-hover:bg-blue-200 transition-colors">
              <FaVideo className="text-blue-600 text-2xl" />
            </div>
            <h4 className="text-gray-800 font-bold text-lg mb-2">Real-time Video</h4>
            <p className="text-gray-600 text-sm">HD video quality with ultra-low latency</p>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-green-100 hover:border-green-300 transition-all duration-300 group shadow-md hover:shadow-lg">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-xl mb-4 group-hover:bg-green-200 transition-colors">
              <FaCloud className="text-green-600 text-2xl" />
            </div>
            <h4 className="text-gray-800 font-bold text-lg mb-2">Secure Storage</h4>
            <p className="text-gray-600 text-sm">Cloud-based encrypted file storage</p>
          </div>

          <div className="bg-white rounded-xl p-6 border-2 border-blue-100 hover:border-blue-300 transition-all duration-300 group shadow-md hover:shadow-lg">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-xl mb-4 group-hover:bg-blue-200 transition-colors">
              <FaUsers className="text-blue-600 text-2xl" />
            </div>
            <h4 className="text-gray-800 font-bold text-lg mb-2">Collaboration</h4>
            <p className="text-gray-600 text-sm">Work together in real-time seamlessly</p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-blue-500 to-green-500 rounded-2xl p-8 shadow-2xl text-white">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">∞</div>
              <div className="text-blue-100 text-lg">Unlimited Meetings</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">100%</div>
              <div className="text-blue-100 text-lg">Secure & Encrypted</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">24/7</div>
              <div className="text-blue-100 text-lg">Always Available</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
