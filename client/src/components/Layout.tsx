import { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  FaVideo, 
  FaFile, 
  FaSignOutAlt, 
  FaShieldAlt, 
  FaLock,
  FaHome,
  FaComments,
  FaCalendarAlt,
  FaClock,
  FaTrash,
  FaCog,
  FaUsers
} from 'react-icons/fa'
import { removeToken } from '../utils/auth'
import ThemeToggle from './ThemeToggle'
import FloatingAIAssistant from './FloatingAIAssistant'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    // Temporarily disabled - just navigate to dashboard
    // removeToken()
    // navigate('/login')
    navigate('/dashboard')
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const navItems = [
    { path: '/dashboard', icon: FaHome, label: 'Dashboard' },
    { path: '/rooms', icon: FaUsers, label: 'Rooms' },
    { path: '/chat', icon: FaComments, label: 'Chat' },
    { path: '/calendar', icon: FaCalendarAlt, label: 'Calendar' },
    { path: '/files', icon: FaFile, label: 'Files' },
    { path: '/recent', icon: FaClock, label: 'Recent' },
    { path: '/trash', icon: FaTrash, label: 'Trash' },
    { path: '/security', icon: FaShieldAlt, label: 'Security' },
    { path: '/administration', icon: FaCog, label: 'Admin' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 transition-colors flex">
      {/* Left Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-r border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/5 sticky top-0 h-screen">
        {/* Logo */}
        <div className="p-6 border-b border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20">
              <FaShieldAlt className="text-white text-xl" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent tracking-tight">
              Secure Web
            </h1>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-500 dark:to-green-500 text-white shadow-md'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <Icon className="text-base" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-blue-200/50 dark:border-blue-800/50 space-y-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <FaSignOutAlt className="text-sm" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar (Mobile & Desktop Header) */}
        <nav className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-b border-blue-200/50 dark:border-blue-800/50 sticky top-0 z-50 shadow-lg shadow-blue-500/5">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              {/* Mobile Logo */}
              <div className="flex lg:hidden items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20">
                  <FaShieldAlt className="text-white text-lg" />
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent tracking-tight">
                  Secure Web
                </h1>
              </div>

              {/* Desktop Header (Empty space for logo) */}
              <div className="hidden lg:block"></div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2">
                <div className="lg:hidden">
                  <ThemeToggle />
                </div>
                <button
                  onClick={handleLogout}
                  className="lg:hidden px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  <FaSignOutAlt className="text-sm" />
                </button>
              </div>
            </div>

            {/* Mobile Navigation */}
            <div className="lg:hidden pb-3 pt-2 flex overflow-x-auto gap-1 scrollbar-hide">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                      active
                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                        : 'bg-white/80 dark:bg-gray-700/80 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="text-sm" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 pb-8">
          {children}
        </main>

        {/* Floating AI Assistant */}
        <FloatingAIAssistant />
      </div>
    </div>
  )
}

