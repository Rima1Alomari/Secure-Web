import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { FaVideo, FaFile, FaUsers, FaCloud, FaArrowRight, FaShieldAlt, FaClock, FaLightbulb } from 'react-icons/fa'

const Dashboard = () => {
  const navigate = useNavigate()
  const [channelName, setChannelName] = useState('')

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
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 rounded-2xl mb-6 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10">
            <FaShieldAlt className="text-white text-3xl" />
          </div>
          <h2 className="text-4xl md:text-5xl font-semibold mb-4 text-gray-900 dark:text-white tracking-tight">
            Welcome to Secure Web
          </h2>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Advanced secure collaboration platform with quantum-resistant encryption, AI threat detection, and zero-trust architecture
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Video Conferencing Card */}
          <div className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 border-2 border-blue-200/50 dark:border-blue-800/50 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-2xl mb-6 transition-transform duration-300 group-hover:scale-110 shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/10">
              <FaVideo className="text-white text-3xl" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">Video Conferencing</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-sm">
              Join or create high-quality video meetings with real-time audio, video, and screen sharing capabilities. Perfect for team collaboration and remote work.
            </p>
            <form onSubmit={handleJoinVideo} className="space-y-4">
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Enter channel name"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                required
              />
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
              >
                Join Room <FaArrowRight className="text-xs" />
              </button>
            </form>
          </div>

          {/* File Manager Card */}
          <div className="group bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-8 border-2 border-green-200/50 dark:border-green-800/50 hover:border-green-500 dark:hover:border-green-400 transition-all duration-300 shadow-xl shadow-green-500/10 hover:shadow-2xl hover:shadow-green-500/20 hover:-translate-y-1">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-600 via-green-500 to-green-400 rounded-2xl mb-6 transition-transform duration-300 group-hover:scale-110 shadow-lg shadow-green-500/30 ring-4 ring-green-500/10">
              <FaFile className="text-white text-3xl" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">File Manager</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-sm">
              Upload, manage, and share your files securely. Collaborate on documents with real-time editing. All files are encrypted and stored safely in the cloud.
            </p>
            <button
              onClick={handleOpenFiles}
              className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white font-medium py-2.5 px-5 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
            >
              Open Files <FaArrowRight className="text-xs" />
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl mb-4 shadow-lg shadow-blue-500/30">
              <FaVideo className="text-white text-2xl" />
            </div>
            <h4 className="text-gray-900 dark:text-white font-semibold text-base mb-2">Real-time Video</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">HD video quality with ultra-low latency</p>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200/50 dark:border-green-800/50 hover:border-green-500 dark:hover:border-green-400 transition-all duration-300 shadow-lg shadow-green-500/10 hover:shadow-xl hover:shadow-green-500/20 hover:-translate-y-1">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-green-400 rounded-xl mb-4 shadow-lg shadow-green-500/30">
              <FaCloud className="text-white text-2xl" />
            </div>
            <h4 className="text-gray-900 dark:text-white font-semibold text-base mb-2">Secure Storage</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Cloud-based encrypted file storage</p>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 shadow-lg shadow-blue-500/10 hover:shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-green-500 rounded-xl mb-4 shadow-lg shadow-blue-500/30">
              <FaUsers className="text-white text-2xl" />
            </div>
            <h4 className="text-gray-900 dark:text-white font-semibold text-base mb-2">Collaboration</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">Work together in real-time seamlessly</p>
          </div>
        </div>

        {/* AI Features Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* AI Meeting Summary Widget */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FaClock className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Meeting Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Last Meeting: Project Review</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Key points: 5 action items, 3 decisions made</p>
              </div>
              <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200">
                View Full Summary
              </button>
            </div>
          </div>

          {/* AI Insights for Suggested Meeting Times */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10 hover:shadow-2xl hover:shadow-green-500/20 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <FaLightbulb className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">AI Insights</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Best Meeting Time</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Tomorrow 10:00 AM - 95% availability</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <FaClock className="text-blue-600 dark:text-blue-400" />
                <span>Based on team calendar analysis</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 dark:from-blue-700 dark:via-blue-600 dark:to-green-700 rounded-2xl p-8 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10 text-white">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="transform hover:scale-110 transition-transform duration-300">
              <div className="text-5xl font-bold mb-3 drop-shadow-lg">∞</div>
              <div className="text-white/90 text-base font-semibold">Unlimited Meetings</div>
            </div>
            <div className="transform hover:scale-110 transition-transform duration-300">
              <div className="text-5xl font-bold mb-3 drop-shadow-lg">100%</div>
              <div className="text-white/90 text-base font-semibold">Secure & Encrypted</div>
            </div>
            <div className="transform hover:scale-110 transition-transform duration-300">
              <div className="text-5xl font-bold mb-3 drop-shadow-lg">24/7</div>
              <div className="text-white/90 text-base font-semibold">Always Available</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
