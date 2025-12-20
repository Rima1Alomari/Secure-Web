import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaUsers, FaCog, FaSearch, FaSortUp, FaSortDown, FaChevronLeft, FaChevronRight, FaEllipsisV, FaExclamationTriangle, FaDownload, FaPalette, FaCheckCircle, FaUpload, FaTimes } from 'react-icons/fa'
import TableSkeleton from '../components/TableSkeleton'
import { Modal, Toast } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { ADMIN_USERS_KEY, SECURITY_LOGS_KEY, FILES_KEY, SECURITY_SETTINGS_KEY, EVENTS_KEY } from '../data/keys'
import { AdminUserMock, SecurityLog } from '../types/models'
import { subscribeToUsers, saveUser, deleteUser } from '../services/firestore'

const Administration = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  
  // Validate tab parameter and redirect invalid ones
  useEffect(() => {
    if (tabParam && tabParam !== 'teams' && tabParam !== 'settings') {
      setSearchParams({ tab: 'teams' })
      setActiveTab('teams')
    } else if (tabParam === 'teams' || tabParam === 'settings') {
      setActiveTab(tabParam)
    }
  }, [tabParam, setSearchParams])
  
  const [activeTab, setActiveTab] = useState<'teams' | 'settings'>('teams')
  const [backendConnected] = useState(false) // Demo mode
  const [selectedRowMenu, setSelectedRowMenu] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUserMock[]>([])
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUserMock | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [themeSettings, setThemeSettings] = useState(() => {
    const saved = getJSON<{ logoColor: string; sidebarColor: string; logoUrl?: string }>('admin-theme-settings', null)
    return saved || { logoColor: 'blue', sidebarColor: 'blue', logoUrl: undefined }
  })
  
  const [logoPreview, setLogoPreview] = useState<string | null>(themeSettings.logoUrl || null)
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'User' as AdminUserMock['role'],
    status: 'Active' as AdminUserMock['status']
  })

  const tabs = [
    { id: 'teams', label: 'Teams', icon: FaUsers },
    { id: 'settings', label: 'Settings', icon: FaCog }
  ]
  
  const handleTabChange = (tabId: 'teams' | 'settings') => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }
  
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      setToast({ message: 'Invalid file type. Please upload PNG, JPG, or SVG.', type: 'error' })
      return
    }
    
    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      setToast({ message: 'File size exceeds 2MB limit.', type: 'error' })
      return
    }
    
    // Read file and convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setLogoPreview(base64String)
      const updatedSettings = { ...themeSettings, logoUrl: base64String }
      setThemeSettings(updatedSettings)
      setJSON('admin-theme-settings', updatedSettings)
      // Dispatch custom event to update logo in Layout
      window.dispatchEvent(new Event('logo-updated'))
      setToast({ message: 'Logo uploaded successfully', type: 'success' })
    }
    reader.onerror = () => {
      setToast({ message: 'Error reading file', type: 'error' })
    }
    reader.readAsDataURL(file)
  }
  
  const handleRemoveLogo = () => {
    setLogoPreview(null)
    const updatedSettings = { ...themeSettings, logoUrl: undefined }
    setThemeSettings(updatedSettings)
    setJSON('admin-theme-settings', updatedSettings)
    // Dispatch custom event to update logo in Layout
    window.dispatchEvent(new Event('logo-updated'))
    setToast({ message: 'Logo removed', type: 'info' })
  }

  // Load users from Firestore in real-time
  useEffect(() => {
    setIsLoading(true)
    
    // Subscribe to users from Firestore
    const unsubscribe = subscribeToUsers((firestoreUsers) => {
      // Map Firestore users to AdminUserMock format
      const mappedUsers: AdminUserMock[] = firestoreUsers.map((user: any) => ({
        id: user.id,
        name: user.name || user.email || 'Unknown',
        email: user.email || '',
        role: user.role === 'admin' ? 'Admin' : 'User',
        status: user.isOnline ? 'Active' : (user.status || 'Active'),
        createdAt: user.createdAt || user.createdAt?.toISOString() || nowISO(),
        userId: user.id,
        isOnline: user.isOnline || false
      }))
      
      // If no users in Firestore, initialize with defaults
      if (mappedUsers.length === 0) {
        const defaultUsers: AdminUserMock[] = [
          { id: uuid(), name: 'Ahmed', email: 'ahmed@example.com', role: 'Admin', status: 'Active', createdAt: nowISO(), userId: '#AD001' },
          { id: uuid(), name: 'Ali', email: 'ali@example.com', role: 'User', status: 'Active', createdAt: nowISO(), userId: '#US001' },
          { id: uuid(), name: 'Mohammed', email: 'mohammed@example.com', role: 'User', status: 'Active', createdAt: nowISO(), userId: '#US002' },
        ]
        // Save defaults to Firestore
        defaultUsers.forEach(user => {
          saveUser({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role.toLowerCase(),
            isOnline: false
          }).catch(console.error)
        })
        setUsers(defaultUsers)
      } else {
        setUsers(mappedUsers)
      }
      
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])
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

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    try {
      const userId = uuid()
      const userData = {
        id: userId,
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        role: newUser.role.toLowerCase(),
        isOnline: false,
        status: newUser.status.toLowerCase()
      }

      // Save to Firestore
      await saveUser(userData)
      
      setToast({ message: `User "${newUser.name}" added successfully`, type: 'success' })
      setNewUser({ name: '', email: '', role: 'User', status: 'Active' })
      setShowAddUserModal(false)
      // Users will update automatically via subscription
    } catch (error) {
      console.error('Error adding user:', error)
      setToast({ message: 'Failed to add user. Please try again.', type: 'error' })
    }
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

  const handleUpdateUser = async () => {
    if (!editingUser || !newUser.name.trim() || !newUser.email.trim()) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    try {
      const userData = {
        id: editingUser.id,
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        role: newUser.role.toLowerCase(),
        status: newUser.status.toLowerCase()
      }

      // Update in Firestore
      await saveUser(userData)
      
      setToast({ message: `User "${newUser.name}" updated successfully`, type: 'success' })
      setShowEditUserModal(false)
      setEditingUser(null)
      setNewUser({ name: '', email: '', role: 'User', status: 'Active' })
      // Users will update automatically via subscription
    } catch (error) {
      console.error('Error updating user:', error)
      setToast({ message: 'Failed to update user. Please try again.', type: 'error' })
    }
  }

  const handleDeleteUser = async (user: AdminUserMock) => {
    if (window.confirm(`Are you sure you want to delete "${user.name}"?`)) {
      try {
        await deleteUser(user.id)
        setToast({ message: `User "${user.name}" deleted`, type: 'info' })
        // Users will update automatically via subscription
      } catch (error) {
        console.error('Error deleting user:', error)
        setToast({ message: 'Failed to delete user. Please try again.', type: 'error' })
      }
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
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="page-title">
                Administration
              </h1>
              <p className="page-subtitle">
                Manage system and settings
              </p>
            </div>
          </div>
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
                    onClick={() => handleTabChange(tab.id as 'teams' | 'settings')}
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
            {activeTab === 'teams' && (
              <div>
                {isLoading ? (
                  <TableSkeleton rows={5} columns={5} />
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Team Management
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
                      placeholder="Search teams, members, role…"
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
                      Customize logo and sidebar colors
                    </p>
                    
                    <div className="space-y-4">
                      {/* Upload Logo Section */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Upload Logo
                        </label>
                        <div className="space-y-3">
                          {logoPreview ? (
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <img 
                                  src={logoPreview} 
                                  alt="Logo preview" 
                                  className="w-20 h-20 rounded-lg object-contain border-2 border-gray-200 dark:border-gray-700"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  Logo uploaded
                                </p>
                                <button
                                  onClick={handleRemoveLogo}
                                  className="btn-secondary text-sm flex items-center gap-2"
                                >
                                  <FaTimes /> Remove Logo
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                                  onChange={handleLogoUpload}
                                  className="hidden"
                                />
                                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                                  <FaUpload className="text-gray-400 dark:text-gray-500 text-2xl mx-auto mb-2" />
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    Click to upload or drag and drop
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    PNG, JPG, SVG (max 2MB)
                                  </p>
                                </div>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                      
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
                          Settings saved successfully
                        </p>
                      </div>
                    </div>
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


