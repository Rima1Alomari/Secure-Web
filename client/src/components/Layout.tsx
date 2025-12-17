import { ReactNode, useState, useMemo, useEffect } from 'react'
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
  FaUsers,
  FaChevronLeft,
  FaChevronRight,
  FaMoon,
  FaSun,
  FaInfoCircle
} from 'react-icons/fa'
import { removeToken } from '../utils/auth'
import ThemeToggle from './ThemeToggle'
import FloatingAIAssistant from './FloatingAIAssistant'
import GlobalSearch from './GlobalSearch'
import NotificationsCenter from './NotificationsCenter'
import { useUser, UserRole } from '../contexts/UserContext'
import RoleSwitcher from './RoleSwitcher'
import { getJSON } from '../data/storage'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { role } = useUser()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark')
  })
  
  // Get uploaded logo from settings
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    const settings = getJSON<{ logoUrl?: string }>('admin-theme-settings', null)
    return settings?.logoUrl || null
  })
  
  // Listen for logo updates
  useEffect(() => {
    const handleStorageChange = () => {
      const settings = getJSON<{ logoUrl?: string }>('admin-theme-settings', null)
      setLogoUrl(settings?.logoUrl || null)
    }
    
    // Listen for custom event (when logo is updated in Administration)
    window.addEventListener('logo-updated', handleStorageChange)
    // Also listen for storage events (in case of cross-tab updates)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('logo-updated', handleStorageChange)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const handleLogout = () => {
    // Temporarily disabled - just navigate to dashboard
    // removeToken()
    // navigate('/login')
    navigate('/dashboard')
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  // Define all navigation items with their required roles
  const allNavItems = [
    { path: '/dashboard', icon: FaHome, label: 'Dashboard', roles: ['user', 'admin', 'security'] as UserRole[] },
    { path: '/rooms', icon: FaUsers, label: 'Rooms', roles: ['user', 'admin'] as UserRole[] },
    { path: '/chat', icon: FaComments, label: 'Chat', roles: ['user', 'admin'] as UserRole[] },
    { path: '/calendar', icon: FaCalendarAlt, label: 'Calendar', roles: ['user', 'admin'] as UserRole[] },
    { path: '/files', icon: FaFile, label: 'Files', roles: ['user', 'admin'] as UserRole[] },
    { path: '/recent', icon: FaClock, label: 'Recent', roles: ['user', 'admin'] as UserRole[] },
    { path: '/trash', icon: FaTrash, label: 'Trash', roles: ['admin'] as UserRole[] },
    { path: '/security', icon: FaShieldAlt, label: 'Security', roles: ['admin', 'security'] as UserRole[] },
    { path: '/administration', icon: FaCog, label: 'Admin', roles: ['admin'] as UserRole[] },
  ]

  // Filter navigation items based on user role
  const navItems = useMemo(() => {
    return allNavItems.filter(item => item.roles.includes(role))
  }, [role])

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 transition-colors flex">
      {/* Left Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-r border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/5 sticky top-0 h-screen transition-all duration-300 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        {/* Logo & Collapse Toggle */}
        <div className="p-6 border-b border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-center gap-3 justify-between">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-12 h-12 rounded-xl object-contain"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20">
                    <FaShieldAlt className="text-white text-xl" />
                  </div>
                )}
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent tracking-tight">
                  Secure Web
                </h1>
              </div>
            )}
            {isSidebarCollapsed && (
              <>
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-12 h-12 rounded-xl object-contain mx-auto"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20 mx-auto">
                    <FaShieldAlt className="text-white text-xl" />
                  </div>
                )}
              </>
            )}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 hover:text-gray-900 dark:hover:text-white"
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <FaChevronRight className="text-sm" />
              ) : (
                <FaChevronLeft className="text-sm" />
              )}
            </button>
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
                className={`group relative w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-3 ${
                  active
                    ? 'bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-500 dark:to-green-500 text-white shadow-md'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                title={isSidebarCollapsed ? item.label : ''}
              >
                {/* Left Indicator Bar for Active State */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white dark:bg-white rounded-r-full shadow-lg transition-all duration-300" />
                )}
                <Icon className={`text-base flex-shrink-0 transition-transform duration-300 ${isSidebarCollapsed ? 'mx-auto' : ''} ${!active ? 'group-hover:scale-110' : ''}`} />
                {!isSidebarCollapsed && (
                  <span className="transition-opacity duration-300 whitespace-nowrap">{item.label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-blue-200/50 dark:border-blue-800/50 space-y-2">
          {isSidebarCollapsed ? (
            <button
              onClick={() => {
                const newIsDark = !isDark
                setIsDark(newIsDark)
                if (newIsDark) {
                  document.documentElement.classList.add('dark')
                  localStorage.setItem('theme', 'dark')
                } else {
                  document.documentElement.classList.remove('dark')
                  localStorage.setItem('theme', 'light')
                }
              }}
              className="w-full px-2 py-2.5 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 hover:from-blue-100 hover:to-green-100 dark:hover:from-blue-900/30 dark:hover:to-green-900/30 transition-all duration-300 flex items-center justify-center text-gray-700 dark:text-gray-300"
              title="Toggle theme"
            >
              {isDark ? (
                <FaSun className="text-yellow-500 text-lg" />
              ) : (
                <FaMoon className="text-blue-600 dark:text-blue-400 text-lg" />
              )}
            </button>
          ) : (
            <ThemeToggle />
          )}
          <button
            onClick={handleLogout}
            className={`w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              isSidebarCollapsed ? 'px-2' : ''
            }`}
            title={isSidebarCollapsed ? 'Logout' : ''}
          >
            <FaSignOutAlt className="text-sm flex-shrink-0" />
            {!isSidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar (Mobile & Desktop Header) */}
        <nav className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-b border-blue-200/50 dark:border-blue-800/50 sticky top-0 z-50 shadow-lg shadow-blue-500/5">
          <div className="px-2 sm:px-4 lg:px-8">
            {/* Mobile Layout */}
            <div className="lg:hidden space-y-2 py-2">
              <div className="flex justify-between items-center gap-2">
                {/* Mobile Logo */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Logo" 
                      className="w-9 h-9 rounded-xl object-contain"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20">
                      <FaShieldAlt className="text-white text-base" />
                    </div>
                  )}
                  <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent tracking-tight">
                    Secure Web
                  </h1>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <RoleSwitcher />
                  <NotificationsCenter />
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors duration-200 flex items-center gap-1.5"
                  >
                    <FaSignOutAlt className="text-xs" />
                  </button>
                </div>
              </div>
              
              {/* Global Search - Mobile */}
              <div className="w-full">
                <GlobalSearch />
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:flex justify-between items-center gap-4 h-16">
              {/* Desktop Header (Empty space for logo) */}
              <div className="flex-shrink-0"></div>

              {/* Global Search - Center */}
              <div className="flex-1 max-w-2xl">
                <GlobalSearch />
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <RoleSwitcher />
                <NotificationsCenter />
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
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                      active
                        ? 'bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-500 dark:to-green-500 text-white shadow-md'
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

