import { ReactNode, useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  FaFile, 
  FaSignOutAlt, 
  FaShieldAlt, 
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
  FaSun
} from 'react-icons/fa'
import { removeToken } from '../utils/auth'
import ThemeToggle from './ThemeToggle'
import FloatingAIAssistant from './FloatingAIAssistant'
import GlobalSearch from './GlobalSearch'
import NotificationsCenter from './NotificationsCenter'
import { useUser, UserRole } from '../contexts/UserContext'
import { getJSON } from '../data/storage'

interface LayoutProps {
  children: ReactNode
  onLogout?: () => void
}

export default function Layout({ children, onLogout }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, setUser } = useUser()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark')
  })
  
  // Get uploaded logo from settings, fallback to default Aramco Digital logo
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    const settings = getJSON<{ logoUrl?: string }>('admin-theme-settings', null)
    return settings?.logoUrl || '/aramco-digital-logo.jpeg'
  })
  
  // Listen for logo updates
  useEffect(() => {
    const handleStorageChange = () => {
      const settings = getJSON<{ logoUrl?: string }>('admin-theme-settings', null)
      setLogoUrl(settings?.logoUrl || '/aramco-digital-logo.jpeg')
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
    // Remove token and user data
    removeToken()
    setUser(null)
    
    // Notify parent component if callback provided
    if (onLogout) {
      onLogout()
    }
    
    // Navigate to login
    navigate('/login')
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex">
      {/* Left Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 shadow-sm sticky top-0 h-screen transition-all duration-300 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        {/* Collapse Toggle */}
        <div className="p-6 border-b border-gray-300 dark:border-gray-700">
          <div className="flex items-center justify-end">
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
                className={`group relative w-full px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-3 ${
                  active
                    ? 'bg-slate-700 dark:bg-slate-600 text-white'
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
        <div className="p-4 border-t border-gray-300 dark:border-gray-700 space-y-2">
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
              className="w-full px-2 py-2.5 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 flex items-center justify-center text-gray-700 dark:text-gray-300"
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
            className={`w-full px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
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
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
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
                      className="w-32 h-32 object-contain logo-no-bg"
                      style={{ 
                        background: 'transparent',
                        imageRendering: 'crisp-edges'
                      } as React.CSSProperties}
                    />
                  ) : (
                    <div className="w-32 h-32 bg-slate-700 dark:bg-slate-600 rounded-lg flex items-center justify-center shadow-sm">
                      <FaShieldAlt className="text-white text-base" />
                    </div>
                  )}
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                    Role: <span className="text-slate-700 dark:text-slate-300 font-bold capitalize">{role}</span>
                  </div>
                  <NotificationsCenter />
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-md text-xs font-medium transition-colors duration-200 flex items-center gap-1.5"
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
            <div className="hidden lg:flex justify-between items-center gap-4 h-32">
              {/* Desktop Logo */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="w-40 h-40 object-contain logo-no-bg"
                    style={{ 
                      background: 'transparent',
                      imageRendering: 'crisp-edges'
                    } as React.CSSProperties}
                  />
                ) : (
                  <div className="w-40 h-40 bg-slate-700 dark:bg-slate-600 rounded-lg flex items-center justify-center shadow-sm">
                    <FaShieldAlt className="text-white text-base" />
                  </div>
                )}
              </div>

              {/* Global Search - Center */}
              <div className="flex-1 max-w-2xl">
                <GlobalSearch />
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                  Role: <span className="text-slate-700 dark:text-slate-300 font-bold capitalize">{role}</span>
                </div>
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
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-colors duration-200 flex items-center gap-1.5 whitespace-nowrap ${
                      active
                        ? 'bg-slate-700 dark:bg-slate-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
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

