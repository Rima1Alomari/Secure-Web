import { useState, useEffect } from 'react'
import { 
  FiUser, 
  FiMail, 
  FiShield, 
  FiEdit2, 
  FiSave, 
  FiX,
  FiKey,
  FiCamera,
  FiBriefcase,
  FiLayers,
  FiPhone,
  FiFileText
} from 'react-icons/fi'
import { useUser } from '../contexts/UserContext'
import { Toast, Modal } from '../components/common'

export default function Profile() {
  const { user, setUser } = useUser()
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedEmail, setEditedEmail] = useState('')
  const [editedJobTitle, setEditedJobTitle] = useState('')
  const [editedDepartment, setEditedDepartment] = useState('')
  const [editedPhone, setEditedPhone] = useState('')
  const [editedBio, setEditedBio] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Debug: Log when Profile component mounts
  useEffect(() => {
    console.log('Profile page loaded', { user })
  }, [user])

  useEffect(() => {
    if (user) {
      setEditedName(user.name)
      setEditedEmail(user.email)
      setEditedJobTitle(user.jobTitle || '')
      setEditedDepartment(user.department || '')
      setEditedPhone(user.phone || '')
      setEditedBio(user.bio || '')
      
      // Load profile image from localStorage
      const savedImage = localStorage.getItem(`profile-image-${user.id}`)
      if (savedImage) {
        setProfileImage(savedImage)
      }
    }
  }, [user])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancel = () => {
    if (user) {
      setEditedName(user.name)
      setEditedEmail(user.email)
      setEditedJobTitle(user.jobTitle || '')
      setEditedDepartment(user.department || '')
      setEditedPhone(user.phone || '')
      setEditedBio(user.bio || '')
    }
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!user) return

    if (!editedName.trim()) {
      setToast({ message: 'Name is required', type: 'error' })
      return
    }

    if (!editedEmail.trim() || !editedEmail.includes('@')) {
      setToast({ message: 'Valid email is required', type: 'error' })
      return
    }

    setLoading(true)
    try {
      const API_URL = (import.meta as any).env.VITE_API_URL || '/api'
      const token = localStorage.getItem('token')

      if (token && token !== 'mock-token-for-testing') {
        // Try to update on server
        const response = await fetch(`${API_URL}/auth/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: editedName.trim(),
            email: editedEmail.trim(),
            jobTitle: editedJobTitle.trim(),
            department: editedDepartment.trim(),
            phone: editedPhone.trim(),
            bio: editedBio.trim()
          })
        })

        if (!response.ok) {
          throw new Error('Failed to update profile')
        }
      }

      // Update local user context
      const updatedUser = {
        ...user,
        name: editedName.trim(),
        email: editedEmail.trim(),
        jobTitle: editedJobTitle.trim(),
        department: editedDepartment.trim(),
        phone: editedPhone.trim(),
        bio: editedBio.trim(),
        profileImage: profileImage || user.profileImage
      }
      setUser(updatedUser)

      setToast({ message: 'Profile updated successfully', type: 'success' })
      setIsEditing(false)
    } catch (error: any) {
      // If server update fails, still update locally
      const updatedUser = {
        ...user,
        name: editedName.trim(),
        email: editedEmail.trim(),
        jobTitle: editedJobTitle.trim(),
        department: editedDepartment.trim(),
        phone: editedPhone.trim(),
        bio: editedBio.trim(),
        profileImage: profileImage || user.profileImage
      }
      setUser(updatedUser)
      setToast({ message: 'Profile updated locally', type: 'success' })
      setIsEditing(false)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setToast({ message: 'All password fields are required', type: 'error' })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToast({ message: 'New passwords do not match', type: 'error' })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' })
      return
    }

    setLoading(true)
    try {
      const API_URL = (import.meta as any).env.VITE_API_URL || '/api'
      const token = localStorage.getItem('token')

      if (token && token !== 'mock-token-for-testing') {
        const response = await fetch(`${API_URL}/auth/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to change password')
        }

        setToast({ message: 'Password changed successfully', type: 'success' })
        setShowPasswordModal(false)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setToast({ message: 'Password change requires server connection', type: 'warning' })
      }
    } catch (error: any) {
      setToast({ message: error.message || 'Failed to change password', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      setToast({ message: 'Please select an image file', type: 'error' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'Image size must be less than 5MB', type: 'error' })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const imageDataUrl = reader.result as string
      setProfileImage(imageDataUrl)
      localStorage.setItem(`profile-image-${user.id}`, imageDataUrl)
      
      // Update user context with profile image
      const updatedUser = {
        ...user,
        profileImage: imageDataUrl
      }
      setUser(updatedUser)
      
      setToast({ message: 'Profile image updated', type: 'success' })
    }
    reader.readAsDataURL(file)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
      case 'security':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
    }
  }

  if (!user) {
    return (
      <div className="page-content">
        <div className="page-container">
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Please log in to view your profile</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="page-title">My Profile</h1>
            {!isEditing && (
              <button onClick={handleEdit} className="btn-primary">
                <FiEdit2 /> Edit Profile
              </button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="card">
              <div className="flex flex-col items-center text-center">
                {/* Profile Image */}
                <div className="relative mb-4">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    {profileImage ? (
                      <img 
                        src={profileImage} 
                        alt={user.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span>{user.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 cursor-pointer shadow-lg transition-colors">
                    <FiCamera className="text-sm" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-center bg-white dark:bg-gray-700 border-2 border-blue-500 rounded-lg px-3 py-1 text-2xl font-bold"
                    />
                  ) : (
                    user.name
                  )}
                </h2>

                <div className="mb-4">
                  {isEditing ? (
                    <input
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      className="text-center bg-white dark:bg-gray-700 border-2 border-blue-500 rounded-lg px-3 py-1 text-sm"
                    />
                  ) : (
                    <p className="text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2">
                      <FiMail className="text-sm" />
                      {user.email}
                    </p>
                  )}
                </div>

                <div className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${getRoleColor(user.role)} mb-2`}>
                  {user.role.toUpperCase()}
                </div>

                {!isEditing && user.jobTitle && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {user.jobTitle}
                  </p>
                )}

                {!isEditing && user.department && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {user.department}
                  </p>
                )}

                {isEditing && (
                  <div className="flex gap-2 mt-4 w-full">
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      <FiSave /> {loading ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancel}
                      className="btn-secondary flex items-center justify-center gap-2"
                    >
                      <FiX /> Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Security Settings Quick View */}
            <div className="card">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FiShield /> Security
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="w-full btn-secondary text-left flex items-center justify-center"
                >
                  <span className="flex items-center gap-2">
                    <FiKey /> Change Password
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Activity & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <div className="card">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FiUser /> Account Information
              </h3>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      User ID
                    </label>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{user.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <p className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border-2 ${getRoleColor(user.role)}`}>
                      {user.role.toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <FiBriefcase className="text-sm" /> Job Title
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedJobTitle}
                      onChange={(e) => setEditedJobTitle(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Enter job title"
                    />
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.jobTitle || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <FiLayers className="text-sm" /> Department
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedDepartment}
                      onChange={(e) => setEditedDepartment(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Enter department"
                    />
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.department || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <FiPhone className="text-sm" /> Phone
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {user.phone || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <FiFileText className="text-sm" /> Bio
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editedBio}
                      onChange={(e) => setEditedBio(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Enter bio"
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {user.bio || <span className="text-gray-400 italic">Not set</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Modal */}
        <Modal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false)
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
          }}
          title="Change Password"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Confirm new password"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? 'Changing...' : 'Change Password'}
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

