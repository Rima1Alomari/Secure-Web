import { useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaUsers, FaSearch, FaSortUp, FaSortDown, FaChevronLeft, FaChevronRight, FaEllipsisV } from 'react-icons/fa'
import TableSkeleton from '../components/TableSkeleton'
import { Modal, Toast } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { ADMIN_USERS_KEY, SECURITY_LOGS_KEY, FILES_KEY, SECURITY_SETTINGS_KEY, EVENTS_KEY } from '../data/keys'
import { AdminUserMock, SecurityLog } from '../types/models'
import { subscribeToUsers, saveUser, deleteUser } from '../services/firestore'
import axios from 'axios'
import { getToken } from '../utils/auth'

const Administration = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  
  // Validate tab parameter and redirect invalid ones
  useEffect(() => {
    if (tabParam && tabParam !== 'teams') {
      setSearchParams({ tab: 'teams' })
      setActiveTab('teams')
    } else if (tabParam === 'teams') {
      setActiveTab('teams')
    }
  }, [tabParam, setSearchParams])
  
  const [activeTab, setActiveTab] = useState<'teams'>('teams')
  const [backendConnected] = useState(false) // Demo mode
  const [selectedRowMenu, setSelectedRowMenu] = useState<string | null>(null)
  const actionMenuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const [users, setUsers] = useState<AdminUserMock[]>([])
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'User' as AdminUserMock['role'],
    status: 'Active' as AdminUserMock['status']
  })


  // Load users from backend API (MongoDB)
  useEffect(() => {
    setIsLoading(true)
    
    const fetchUsers = async () => {
      try {
        const token = getToken()
        const API_URL = (import.meta as any).env?.VITE_API_URL || '/api'
        
        // Fetch real users from MongoDB via API
        const response = await axios.get(`${API_URL}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.data && response.data.length > 0) {
          // Map API users to AdminUserMock format
          const mappedUsers: AdminUserMock[] = response.data.map((u: any) => ({
            id: u.id || u._id,
            userId: u.userId || u.id,
            name: u.name || 'Unknown',
            email: u.email || '',
            role: u.role === 'admin' ? 'Admin' : 'User',
            status: 'Active' as const,
            createdAt: nowISO(),
            isOnline: false
          }))
          setUsers(mappedUsers)
        } else {
          // No users found - show empty list (no default users)
          setUsers([])
        }
      } catch (error) {
        console.error('Error fetching users from API:', error)
        // On error, show empty list instead of default users
        setUsers([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchUsers()
    
    // Also subscribe to Firestore for real-time updates (if users exist there)
    const unsubscribe = subscribeToUsers((firestoreUsers) => {
      if (firestoreUsers.length > 0) {
        // Only update if we have real users from Firestore
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
        setUsers(mappedUsers)
      }
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
    // Only email and role are required
    if (!newUser.email.trim()) {
      setToast({ message: 'Please enter an email address', type: 'error' })
      return
    }

    try {
      const token = getToken() || 'dev-token'
      const API_URL = (import.meta as any).env?.VITE_API_URL || '/api'
      
      // Create user via backend API - only email and role required
      const requestData: any = {
        email: newUser.email.trim(),
        role: newUser.role.toLowerCase()
      }
      
      // Include name if provided (optional)
      if (newUser.name.trim()) {
        requestData.name = newUser.name.trim()
      }
      
      const response = await axios.post(
        `${API_URL}/auth/admin/users`,
        requestData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (response.data.user) {
        const userName = newUser.name.trim() || newUser.email.split('@')[0]
        setToast({ message: `User "${userName}" added successfully`, type: 'success' })
        setNewUser({ name: '', email: '', password: '', role: 'User', status: 'Active' })
        setShowAddUserModal(false)
        
        // Refresh users list
        const usersResponse = await axios.get(`${API_URL}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (usersResponse.data && usersResponse.data.length > 0) {
          const mappedUsers: AdminUserMock[] = usersResponse.data.map((u: any) => ({
            id: u.id || u._id,
            userId: u.userId || u.id,
            name: u.name || 'Unknown',
            email: u.email || '',
            role: u.role === 'admin' ? 'Admin' : 'User',
            status: 'Active' as const,
            createdAt: nowISO(),
            isOnline: false
          }))
          setUsers(mappedUsers)
        }
      }
    } catch (error: any) {
      console.error('Error adding user:', error)
      const errorMessage = error.response?.data?.error || 'Failed to add user. Please try again.'
      setToast({ message: errorMessage, type: 'error' })
    }
  }

  const handleDeleteUser = async (user: AdminUserMock) => {
    if (window.confirm(`Are you sure you want to remove "${user.name}"?`)) {
      try {
        const token = getToken()
        const API_URL = (import.meta as any).env?.VITE_API_URL || '/api'
        
        // Delete user via backend API
        await axios.delete(
          `${API_URL}/auth/admin/users/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )
        
        setToast({ message: `User "${user.name}" removed successfully`, type: 'info' })
        
        // Refresh users list
        const usersResponse = await axios.get(`${API_URL}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (usersResponse.data && usersResponse.data.length > 0) {
          const mappedUsers: AdminUserMock[] = usersResponse.data.map((u: any) => ({
            id: u.id || u._id,
            userId: u.userId || u.id,
            name: u.name || 'Unknown',
            email: u.email || '',
            role: u.role === 'admin' ? 'Admin' : 'User',
            status: 'Active' as const,
            createdAt: nowISO(),
            isOnline: false
          }))
          setUsers(mappedUsers)
        } else {
          setUsers([])
        }
      } catch (error: any) {
        console.error('Error deleting user:', error)
        const errorMessage = error.response?.data?.error || 'Failed to remove user. Please try again.'
        setToast({ message: errorMessage, type: 'error' })
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
                Manage teams and users
              </p>
            </div>
          </div>
        </div>

        {/* System Status Strip */}

        <div className="card">
          {/* Tab Content */}
          <div className="p-6">
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
                        type="button"
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
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th 
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b-2 border-gray-300 dark:border-gray-600"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-2">
                            Name
                            <SortIcon field="name" />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b-2 border-gray-300 dark:border-gray-600"
                          onClick={() => handleSort('email')}
                        >
                          <div className="flex items-center gap-2">
                            Email
                            <SortIcon field="email" />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b-2 border-gray-300 dark:border-gray-600"
                          onClick={() => handleSort('role')}
                        >
                          <div className="flex items-center gap-2">
                            Role
                            <SortIcon field="role" />
                          </div>
                        </th>
                        <th 
                          className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b-2 border-gray-300 dark:border-gray-600"
                          onClick={() => handleSort('status')}
                        >
                          <div className="flex items-center gap-2">
                            Status
                            <SortIcon field="status" />
                          </div>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase border-b-2 border-gray-300 dark:border-gray-600">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-100 dark:bg-gray-800">
                      {paginatedUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group border-b border-gray-200 dark:border-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                            {user.role}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-700">
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
                            <div 
                              ref={(el) => {
                                if (el) actionMenuRefs.current[user.id] = el
                              }}
                              className="relative"
                            >
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
                                  <div 
                                    className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 z-20 w-48"
                                    style={{
                                      top: `${actionMenuRefs.current[user.id]?.getBoundingClientRect().bottom || 0}px`,
                                      right: `${window.innerWidth - (actionMenuRefs.current[user.id]?.getBoundingClientRect().right || 0)}px`
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleDeleteUser(user)
                                        setSelectedRowMenu(null)
                                      }}
                                      className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                      Remove User
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


          </div>
        </div>

        {/* Add User Modal */}
        <Modal
          isOpen={showAddUserModal}
          onClose={() => {
            setShowAddUserModal(false)
            setNewUser({ name: '', email: '', password: '', role: 'User', status: 'Active' })
          }}
          title="Add New User"
        >
          <div className="space-y-4">
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
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(false)
                  setNewUser({ name: '', email: '', password: '', role: 'User', status: 'Active' })
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddUser}
                className="btn-primary flex-1"
              >
                Add User
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


