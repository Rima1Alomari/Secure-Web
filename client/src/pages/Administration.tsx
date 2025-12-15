import { useState, useMemo, useEffect } from 'react'
import { FaUsers, FaCog, FaShieldAlt, FaDatabase, FaKey, FaSearch, FaSortUp, FaSortDown, FaChevronLeft, FaChevronRight, FaEllipsisV, FaExclamationTriangle, FaDownload, FaPalette, FaCheckCircle } from 'react-icons/fa'
import TableSkeleton from '../components/TableSkeleton'
import { Modal, Toast } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { ADMIN_USERS_KEY, SECURITY_LOGS_KEY, FILES_KEY, SECURITY_SETTINGS_KEY, EVENTS_KEY } from '../data/keys'
import { AdminUserMock, SecurityLog } from '../types/models'

const Administration = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'settings' | 'security' | 'database'>('users')
  const [backendConnected] = useState(false) // Demo mode
  const [selectedRowMenu, setSelectedRowMenu] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUserMock[]>([])
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUserMock | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [themeSettings, setThemeSettings] = useState(() => {
    const saved = getJSON<{ logoColor: string; sidebarColor: string }>('admin-theme-settings', null)
    return saved || { logoColor: 'blue', sidebarColor: 'blue' }
  })
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'User' as AdminUserMock['role'],
    status: 'Active' as AdminUserMock['status']
  })

  const tabs = [
    { id: 'users', label: 'Users', icon: FaUsers },
    { id: 'settings', label: 'Settings', icon: FaCog },
    { id: 'security', label: 'Security', icon: FaShieldAlt },
    { id: 'database', label: 'Database', icon: FaDatabase }
  ]

  // Load users from localStorage
  useEffect(() => {
    const savedUsers = getJSON<AdminUserMock[]>(ADMIN_USERS_KEY, []) || []
    if (savedUsers.length === 0) {
      // Initialize with default users
      const defaultUsers: AdminUserMock[] = [
        { id: uuid(), name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', createdAt: nowISO() },
        { id: uuid(), name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active', createdAt: nowISO() },
        { id: uuid(), name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive', createdAt: nowISO() },
        { id: uuid(), name: 'Alice Williams', email: 'alice@example.com', role: 'User', status: 'Active', createdAt: nowISO() },
        { id: uuid(), name: 'Charlie Brown', email: 'charlie@example.com', role: 'Moderator', status: 'Active', createdAt: nowISO() },
      ]
      setUsers(defaultUsers)
      setJSON(ADMIN_USERS_KEY, defaultUsers)
    } else {
      setUsers(savedUsers)
    }
    setIsLoading(false)
  }, [])

  // Save users to localStorage whenever they change
  useEffect(() => {
    if (users.length > 0) {
      setJSON(ADMIN_USERS_KEY, users)
    }
  }, [users])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<keyof AdminUserMock | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading for 600ms
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // Filter and sort data
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.status.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = String(a[sortField]).toLowerCase()
        const bVal = String(b[sortField]).toLowerCase()

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [users, searchQuery, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage)
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedUsers.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedUsers, currentPage])

  const handleAddUser = () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    const user: AdminUserMock = {
      id: uuid(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      createdAt: nowISO()
    }

    setUsers(prev => [...prev, user])
    setToast({ message: `User "${user.name}" added successfully`, type: 'success' })
    setShowAddUserModal(false)
    setNewUser({ name: '', email: '', role: 'User', status: 'Active' })
  }

  const handleEditUser = (user: AdminUserMock) => {
    setEditingUser(user)
    setNewUser({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    })
    setShowEditUserModal(true)
  }

  const handleUpdateUser = () => {
    if (!editingUser || !newUser.name.trim() || !newUser.email.trim()) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    setUsers(prev => prev.map(u => 
      u.id === editingUser.id 
        ? { ...u, name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status }
        : u
    ))
    setToast({ message: `User "${newUser.name}" updated successfully`, type: 'success' })
    setShowEditUserModal(false)
    setEditingUser(null)
    setNewUser({ name: '', email: '', role: 'User', status: 'Active' })
  }

  const handleDeleteUser = (user: AdminUserMock) => {
    if (window.confirm(`Are you sure you want to delete "${user.name}"?`)) {
      setUsers(prev => prev.filter(u => u.id !== user.id))
      setToast({ message: `User "${user.name}" deleted`, type: 'info' })
    }
  }

  const handleSort = (field: keyof AdminUserMock) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset to first page on sort
  }

  const SortIcon = ({ field }: { field: keyof AdminUserMock }) => {
    if (sortField !== field) {
      return <FaSortUp className="text-gray-400 opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <FaSortUp className="text-blue-600 dark:text-blue-400" />
    ) : (
      <FaSortDown className="text-blue-600 dark:text-blue-400" />
    )
  }

  return (
    <div className="page-content">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">
            Administration
          </h1>
          <p className="page-subtitle">
            Manage system and settings
          </p>
        </div>

        {/* System Status Strip */}
        <div className={`mb-6 p-3 rounded-lg flex items-center gap-3 ${
          backendConnected 
            ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800' 
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800'
        }`}>
          <FaExclamationTriangle className={`text-lg ${
            backendConnected ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
          }`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${
              backendConnected ? 'text-green-800 dark:text-green-300' : 'text-yellow-800 dark:text-yellow-300'
            }`}>
              {backendConnected ? 'Backend Connected' : 'Backend Disconnected / Demo Mode'}
            </p>
            <p className={`text-xs ${
              backendConnected ? 'text-green-700 dark:text-green-400' : 'text-yellow-700 dark:text-yellow-400'
            }`}>
              {backendConnected ? 'All systems operational' : 'Running in demo mode with mock data'}
            </p>
          </div>
        </div>

        <div className="card">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative px-4 py-3 text-sm font-medium transition-all flex items-center gap-2 ${
                      activeTab === tab.id
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon /> {tab.label}
                    {activeTab === tab.id && (
                      <>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 rounded-t-full"></div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 opacity-50 blur-sm"></div>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'users' && (
              <div>
                {isLoading ? (
                  <TableSkeleton rows={5} columns={5} />
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        User Management
                      </h2>
                      <button 
                        onClick={() => setShowAddUserModal(true)}
                        className="btn-primary"
                      >
                        Add User
                      </button>
                    </div>

                    {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setCurrentPage(1) // Reset to first page on search
                      }}
                      placeholder="Search by name, email, role, or status..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-sm"
                    />
                  </div>
                </div>

                {/* Table with horizontal scroll on small screens */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-2">
                            Name
                            <SortIcon field="name" />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => handleSort('email')}
                        >
                          <div className="flex items-center gap-2">
                            Email
                            <SortIcon field="email" />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => handleSort('role')}
                        >
                          <div className="flex items-center gap-2">
                            Role
                            <SortIcon field="role" />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center gap-2">
                            Status
                            <SortIcon field="status" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {paginatedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                            {user.role}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                user.status === 'Active'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              }`}
                            >
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm relative">
                            <div className="relative">
                              <button
                                onClick={() => setSelectedRowMenu(selectedRowMenu === user.id ? null : user.id)}
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              >
                                <FaEllipsisV />
                              </button>
                              {selectedRowMenu === user.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setSelectedRowMenu(null)}
                                  ></div>
                                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 z-20">
                                    <button
                                      onClick={() => {
                                        handleEditUser(user)
                                        setSelectedRowMenu(null)
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                      Edit User
                                    </button>
                                    <div className="border-t border-gray-200 dark:border-gray-700"></div>
                                    <button
                                      onClick={() => {
                                        handleDeleteUser(user)
                                        setSelectedRowMenu(null)
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                      Delete User
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedUsers.length)} of {filteredAndSortedUsers.length} users
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        <FaChevronLeft className="text-xs" />
                        Previous
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 dark:bg-blue-500 text-white'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        Next
                        <FaChevronRight className="text-xs" />
                      </button>
                    </div>
                  </div>
                )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  System Settings
                </h2>
                <div className="space-y-6">
                  <div className="card">
                    <div className="flex items-center gap-3 mb-4">
                      <FaPalette className="text-blue-600 dark:text-blue-400 text-xl" />
                      <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                        Theme Customization
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Customize logo and sidebar colors (Demo Mode)
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Logo Color
                        </label>
                        <div className="flex gap-2">
                          {['blue', 'green', 'purple', 'red'].map(color => (
                            <button
                              key={color}
                              onClick={() => {
                                setThemeSettings(prev => ({ ...prev, logoColor: color }))
                                setJSON('admin-theme-settings', { ...themeSettings, logoColor: color })
                                setToast({ message: `Logo color changed to ${color}`, type: 'success' })
                              }}
                              className={`w-12 h-12 rounded-lg border-2 transition-all ${
                                themeSettings.logoColor === color
                                  ? 'border-blue-600 dark:border-blue-400 ring-2 ring-blue-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              } ${
                                color === 'blue' ? 'bg-blue-600' :
                                color === 'green' ? 'bg-green-600' :
                                color === 'purple' ? 'bg-purple-600' :
                                'bg-red-600'
                              }`}
                              title={color.charAt(0).toUpperCase() + color.slice(1)}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Sidebar Color
                        </label>
                        <div className="flex gap-2">
                          {['blue', 'green', 'purple', 'red'].map(color => (
                            <button
                              key={color}
                              onClick={() => {
                                setThemeSettings(prev => ({ ...prev, sidebarColor: color }))
                                setJSON('admin-theme-settings', { ...themeSettings, sidebarColor: color })
                                setToast({ message: `Sidebar color changed to ${color}`, type: 'success' })
                              }}
                              className={`w-12 h-12 rounded-lg border-2 transition-all ${
                                themeSettings.sidebarColor === color
                                  ? 'border-blue-600 dark:border-blue-400 ring-2 ring-blue-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              } ${
                                color === 'blue' ? 'bg-blue-600' :
                                color === 'green' ? 'bg-green-600' :
                                color === 'purple' ? 'bg-purple-600' :
                                'bg-red-600'
                              }`}
                              title={color.charAt(0).toUpperCase() + color.slice(1)}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <FaCheckCircle className="inline mr-1 text-blue-600 dark:text-blue-400" />
                          Settings saved to localStorage (Demo Mode)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Security Logs
                </h2>
                <div className="space-y-4">
                  <div className="card">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Last Scan Logs
                    </h3>
                    {(() => {
                      const securityLogs = getJSON<SecurityLog[]>(SECURITY_LOGS_KEY, []) || []
                      const recentLogs = securityLogs.slice(0, 10).reverse()
                      
                      if (recentLogs.length === 0) {
                        return (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            No security scan logs available. Run a scan from the Security Center.
                          </p>
                        )
                      }
                      
                      return (
                        <div className="space-y-2">
                          {recentLogs.map(log => (
                            <div
                              key={log.id}
                              className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {log.event}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                    {log.source} • {new Date(log.timestamp).toLocaleString()}
                                  </p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                  log.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                  log.severity === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                  log.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                }`}>
                                  {log.severity}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                  Database Management
                </h2>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="card">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">1.2 GB</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Database Size
                      </div>
                    </div>
                    <div className="card">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">99.9%</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Uptime
                      </div>
                    </div>
                    <div className="card">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">24/7</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Monitoring
                      </div>
                    </div>
                  </div>
                  
                  <div className="card">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Mock DB Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <span className="text-sm text-gray-900 dark:text-white">Connection Status</span>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">Connected</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <span className="text-sm text-gray-900 dark:text-white">Active Queries</span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">12</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <span className="text-sm text-gray-900 dark:text-white">Cache Hit Rate</span>
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">94.5%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Export Data
                    </h3>
                    <button
                      onClick={() => {
                        const allData = {
                          users: getJSON(ADMIN_USERS_KEY, []),
                          files: getJSON(FILES_KEY, []),
                          securityLogs: getJSON(SECURITY_LOGS_KEY, []),
                          settings: getJSON(SECURITY_SETTINGS_KEY, {}),
                          exportedAt: nowISO()
                        }
                        const dataStr = JSON.stringify(allData, null, 2)
                        const dataBlob = new Blob([dataStr], { type: 'application/json' })
                        const url = URL.createObjectURL(dataBlob)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = `database-export-${new Date().toISOString().split('T')[0]}.json`
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        URL.revokeObjectURL(url)
                        setToast({ message: 'Database exported successfully', type: 'success' })
                      }}
                      className="btn-primary"
                    >
                      <FaDownload className="text-sm" />
                      Export JSON
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Add User Modal */}
        <Modal
          isOpen={showAddUserModal}
          onClose={() => {
            setShowAddUserModal(false)
            setNewUser({ name: '', email: '', role: 'User', status: 'Active' })
          }}
          title="Add New User"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter user name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter email address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Role *
              </label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as AdminUserMock['role'] })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
                <option value="Moderator">Moderator</option>
                <option value="Guest">Guest</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Status *
              </label>
              <select
                value={newUser.status}
                onChange={(e) => setNewUser({ ...newUser, status: e.target.value as AdminUserMock['status'] })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowAddUserModal(false)
                  setNewUser({ name: '', email: '', role: 'User', status: 'Active' })
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="btn-primary flex-1"
              >
                Add User
              </button>
            </div>
          </div>
        </Modal>

        {/* Edit User Modal */}
        <Modal
          isOpen={showEditUserModal}
          onClose={() => {
            setShowEditUserModal(false)
            setEditingUser(null)
            setNewUser({ name: '', email: '', role: 'User', status: 'Active' })
          }}
          title="Edit User"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter user name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter email address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Role *
              </label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as AdminUserMock['role'] })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="User">User</option>
                <option value="Admin">Admin</option>
                <option value="Moderator">Moderator</option>
                <option value="Guest">Guest</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Status *
              </label>
              <select
                value={newUser.status}
                onChange={(e) => setNewUser({ ...newUser, status: e.target.value as AdminUserMock['status'] })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowEditUserModal(false)
                  setEditingUser(null)
                  setNewUser({ name: '', email: '', role: 'User', status: 'Active' })
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="btn-primary flex-1"
              >
                Update User
              </button>
            </div>
          </div>
        </Modal>

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  )
}

export default Administration


