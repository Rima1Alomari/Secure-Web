import { ReactNode, useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  FaFile, 
  FaSignOutAlt, 
  FaHome,
  FaComments,
  FaCalendarAlt,
  FaClock,
  FaTrash,
  FaCog,
  FaUsers,
  FaUserShield,
  FaShieldAlt,
  FaChevronLeft,
  FaChevronRight,
  FaMoon,
  FaSun,
  FaUserCircle,
  FaChevronDown,
  FaCircle,
  FaUser
} from 'react-icons/fa'
import { removeToken, getToken } from '../utils/auth'
import FloatingAIAssistant from './FloatingAIAssistant'
import GlobalSearch from './GlobalSearch'
import NotificationsCenter from './NotificationsCenter'
import { useUser, UserRole } from '../contexts/UserContext'
import Modal from './common/Modal'
import { Toast } from './common'
import axios from 'axios'

interface LayoutProps {
  children: ReactNode
  onLogout?: () => void
}

export default function Layout({ children, onLogout }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { role, setUser, user } = useUser()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark')
  })
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [userStatus, setUserStatus] = useState<'available' | 'busy' | 'away' | 'offline'>('available')
  const accountMenuRef = useRef<HTMLDivElement>(null)
  const statusMenuRef = useRef<HTMLDivElement>(null)

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

  const handlePasswordChange = async () => {
    // Reset error
    setPasswordError('')
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setPasswordLoading(true)
    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL || '/api'
      const token = getToken()
      
      const response = await axios.put(
        `${API_URL}/auth/change-password`,
        {
          currentPassword,
          newPassword
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (response.data.message) {
        setToast({ message: 'Password changed successfully', type: 'success' })
        setShowPasswordModal(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setPasswordError('')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to change password. Please try again.'
      setPasswordError(errorMessage)
      setToast({ message: errorMessage, type: 'error' })
    } finally {
      setPasswordLoading(false)
    }
  }

  // Status configuration
  const statusOptions = [
    { value: 'available' as const, label: 'Available', color: 'bg-green-500', icon: FaCircle },
    { value: 'busy' as const, label: 'Busy', color: 'bg-red-500', icon: FaCircle },
    { value: 'away' as const, label: 'Away', color: 'bg-yellow-500', icon: FaCircle },
    { value: 'offline' as const, label: 'Offline', color: 'bg-gray-400', icon: FaCircle },
  ]

  const currentStatus = statusOptions.find(s => s.value === userStatus) || statusOptions[0]

  // Close account menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false)
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false)
      }
    }

    if (showAccountMenu || showStatusMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAccountMenu, showStatusMenu])

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  // Define all navigation items with their required roles
  const allNavItems = [
    { path: '/dashboard', icon: FaHome, label: 'Dashboard', roles: ['user', 'admin'] as UserRole[] },
    { path: '/rooms', icon: FaUsers, label: 'Rooms', roles: ['user', 'admin'] as UserRole[] },
    { path: '/chat', icon: FaComments, label: 'Chat', roles: ['user', 'admin'] as UserRole[] },
    { path: '/calendar', icon: FaCalendarAlt, label: 'Calendar', roles: ['user', 'admin'] as UserRole[] },
    { path: '/files', icon: FaFile, label: 'Files', roles: ['user', 'admin'] as UserRole[] },
    { path: '/recent', icon: FaClock, label: 'Recent', roles: ['user', 'admin'] as UserRole[] },
    { path: '/trash', icon: FaTrash, label: 'Trash', roles: ['admin'] as UserRole[] },
    { path: '/administration', icon: FaUserShield, label: 'Admin', roles: ['admin'] as UserRole[] },
    { path: '/security', icon: FaShieldAlt, label: 'Security', roles: ['admin'] as UserRole[] },
    { path: '/profile', icon: FaUser, label: 'Profile', roles: ['user', 'admin'] as UserRole[] },
  ]

  // Filter navigation items based on user role
  const navItems = useMemo(() => {
    return allNavItems.filter(item => item.roles.includes(role))
  }, [role])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex">
      {/* Left Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 h-screen transition-all duration-300 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        {/* Logo Section */}
        <div className="p-4 border-b border-gray-300 dark:border-gray-700 flex items-center justify-center">
          {isSidebarCollapsed ? (
            <img 
              src="/Saudi-Aramco.CloseTab.png" 
              alt="Aramco Logo" 
              className="w-10 h-10 object-contain"
            />
          ) : (
            <img 
              src={isDark ? '/aramco-digital.L.BT.PNG' : '/aramco-digital.L.WT.png'} 
              alt="Aramco Digital Logo" 
              className={`w-full object-contain ${isDark ? 'h-14' : 'h-12'}`}
            />
          )}
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
                <Icon className={`flex-shrink-0 transition-transform duration-300 ${isSidebarCollapsed ? 'mx-auto text-xl' : 'text-base'} ${!active ? 'group-hover:scale-110' : ''}`} />
                {!isSidebarCollapsed && (
                  <span className="transition-opacity duration-300 whitespace-nowrap">{item.label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom Actions - Theme Toggle and Collapse Toggle */}
        <div className={`p-3 border-t border-blue-200/50 dark:border-blue-800/50 ${isSidebarCollapsed ? 'flex flex-col-reverse items-center gap-2' : 'flex items-center justify-between'}`}>
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
            className={`rounded-full bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 hover:from-blue-100 hover:to-green-100 dark:hover:from-blue-900/30 dark:hover:to-green-900/30 transition-all duration-300 flex items-center justify-center text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg ${
              isSidebarCollapsed ? 'w-12 h-12' : 'w-9 h-9'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              <FaSun className={`text-yellow-500 ${isSidebarCollapsed ? 'text-lg' : 'text-sm'}`} />
            ) : (
              <FaMoon className={`text-blue-600 dark:text-blue-400 ${isSidebarCollapsed ? 'text-lg' : 'text-sm'}`} />
            )}
          </button>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`rounded-full bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 hover:from-blue-100 hover:to-green-100 dark:hover:from-blue-900/30 dark:hover:to-green-900/30 transition-all duration-300 flex items-center justify-center text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg ${
              isSidebarCollapsed ? 'w-12 h-12' : 'w-9 h-9'
            }`}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <FaChevronRight className={isSidebarCollapsed ? 'text-lg' : 'text-sm'} />
            ) : (
              <FaChevronLeft className="text-sm" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navigation Bar (Mobile & Desktop Header) */}
        <nav className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
          <div className="px-2 sm:px-4 lg:px-8">
            {/* Mobile Layout */}
            <div className="lg:hidden space-y-2 py-2">
              <div className="flex justify-end items-center gap-2">
                {/* Right Side Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md">
                    Role: <span className="text-slate-700 dark:text-slate-300 font-bold capitalize">{role}</span>
                  </div>
                  <NotificationsCenter />
                  
                  {/* Account Menu - Mobile */}
                  <div ref={accountMenuRef} className="relative">
                    <button
                      onClick={() => setShowAccountMenu(!showAccountMenu)}
                      className="p-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200"
                      aria-label="Account menu"
                    >
                      {(() => {
                        const profileImg = user?.profileImage || (user?.id ? localStorage.getItem(`profile-image-${user.id}`) : null)
                        return profileImg ? (
                          <img src={profileImg} alt={user?.name || 'User'} className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <FaUserCircle className="h-5 w-5" />
                        )
                      })()}
                    </button>

                    {/* Dropdown Menu - Mobile */}
                    {showAccountMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-visible">
                        {/* User Info Section */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {(() => {
                                const profileImg = user?.profileImage || (user?.id ? localStorage.getItem(`profile-image-${user.id}`) : null)
                                return profileImg ? (
                                  <img src={profileImg} alt={user?.name || 'User'} className="w-full h-full object-cover" />
                                ) : (
                                  <FaUserCircle className="text-white text-xl" />
                                )
                              })()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {user?.name || 'User'}
                              </h3>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {user?.email || 'No email'}
                              </p>
                              {user?.department && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
                                  {user.department}
                                </p>
                              )}
                              <div className="mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
                                  {role}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status Selector */}
                        <div className="py-2 overflow-visible">
                          <div ref={statusMenuRef} className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowStatusMenu(!showStatusMenu)
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${currentStatus.color} ring-2 ring-white dark:ring-gray-800`}></div>
                                <span className="font-medium">{currentStatus.label}</span>
                              </div>
                              <FaChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${showStatusMenu ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Status Dropdown - Using fixed positioning to escape parent overflow */}
                            {showStatusMenu && (
                              <div 
                                className="fixed bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-[100] overflow-hidden min-w-[200px]"
                                style={{
                                  top: `${statusMenuRef.current?.getBoundingClientRect().bottom || 0}px`,
                                  left: `${statusMenuRef.current?.getBoundingClientRect().left || 0}px`,
                                  width: `${statusMenuRef.current?.getBoundingClientRect().width || 200}px`
                                }}
                              >
                                {statusOptions.map((status: typeof statusOptions[0]) => {
                                  const isSelected = status.value === userStatus
                                  return (
                                    <button
                                      key={status.value}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setUserStatus(status.value)
                                        setShowStatusMenu(false)
                                      }}
                                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${
                                        isSelected
                                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                      }`}
                                    >
                                      <div className={`w-3 h-3 rounded-full ${status.color} ring-2 ring-white dark:ring-gray-800 flex-shrink-0`}></div>
                                      <span className={isSelected ? 'font-semibold' : ''}>{status.label}</span>
                                      {isSelected && (
                                        <FaCog className="ml-auto text-blue-600 dark:text-blue-400 text-xs flex-shrink-0" />
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Logout */}
                        <div className="py-2 border-t border-gray-200 dark:border-gray-700">
                          <button
                            onClick={() => {
                              handleLogout()
                              setShowAccountMenu(false)
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3"
                          >
                            <FaSignOutAlt />
                            <span>Logout</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Global Search - Mobile */}
              <div className="w-full">
                <GlobalSearch />
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:flex justify-between items-center gap-4 h-20">
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
                
                {/* Account Menu */}
                <div ref={accountMenuRef} className="relative">
                  <button
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="flex items-center gap-2 p-1.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
                    aria-label="Account menu"
                  >
                    {(() => {
                      const profileImg = user?.profileImage || (user?.id ? localStorage.getItem(`profile-image-${user.id}`) : null)
                      return profileImg ? (
                        <img src={profileImg} alt={user?.name || 'User'} className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <FaUserCircle className="h-6 w-6" />
                      )
                    })()}
                    <FaChevronDown className={`h-3 w-3 transition-transform duration-200 ${showAccountMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showAccountMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-visible">
                      {/* User Info Section */}
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {(() => {
                              const profileImg = user?.profileImage || (user?.id ? localStorage.getItem(`profile-image-${user.id}`) : null)
                              return profileImg ? (
                                <img src={profileImg} alt={user?.name || 'User'} className="w-full h-full object-cover" />
                              ) : (
                                <FaUserCircle className="text-white text-xl" />
                              )
                            })()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                              {user?.name || 'User'}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {user?.email || 'No email'}
                            </p>
                            {user?.department && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-0.5">
                                {user.department}
                              </p>
                            )}
                            <div className="mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
                                {role}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status Selector */}
                      <div className="py-2 overflow-visible">
                        <div ref={statusMenuRef} className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowStatusMenu(!showStatusMenu)
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${currentStatus.color} ring-2 ring-white dark:ring-gray-800`}></div>
                              <span className="font-medium">{currentStatus.label}</span>
                            </div>
                            <FaChevronDown className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${showStatusMenu ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Status Dropdown - Using fixed positioning to escape parent overflow */}
                          {showStatusMenu && (
                            <div 
                              className="fixed bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-[100] overflow-hidden min-w-[200px]"
                              style={{
                                top: `${statusMenuRef.current?.getBoundingClientRect().bottom || 0}px`,
                                left: `${statusMenuRef.current?.getBoundingClientRect().left || 0}px`,
                                width: `${statusMenuRef.current?.getBoundingClientRect().width || 200}px`
                              }}
                            >
                              {statusOptions.map((status: typeof statusOptions[0]) => {
                                const isSelected = status.value === userStatus
                                return (
                                  <button
                                    key={status.value}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setUserStatus(status.value)
                                      setShowStatusMenu(false)
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${
                                      isSelected
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    }`}
                                  >
                                    <div className={`w-3 h-3 rounded-full ${status.color} ring-2 ring-white dark:ring-gray-800 flex-shrink-0`}></div>
                                    <span className={isSelected ? 'font-semibold' : ''}>{status.label}</span>
                                    {isSelected && (
                                      <FaCog className="ml-auto text-blue-600 dark:text-blue-400 text-xs flex-shrink-0" />
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Logout */}
                      <div className="py-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => {
                            handleLogout()
                            setShowAccountMenu(false)
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-3"
                        >
                          <FaSignOutAlt />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
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

      {/* Password Change Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
          setPasswordError('')
        }}
        title="Change Password"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new password (min. 6 characters)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Confirm new password"
            />
          </div>
          {passwordError && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              {passwordError}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowPasswordModal(false)
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                setPasswordError('')
              }}
              className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handlePasswordChange}
              disabled={passwordLoading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-lg transition-all duration-300 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordLoading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

