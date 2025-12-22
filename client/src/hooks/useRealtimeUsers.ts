import { useState, useEffect } from 'react'
import { subscribeToUsers, saveUser, updateUserPresence } from '../services/firestore'
import { useUser } from '../contexts/UserContext'
import { getJSON, setJSON } from '../data/storage'
import { ADMIN_USERS_KEY } from '../data/keys'
import axios from 'axios'
import { getToken } from '../utils/auth'

export function useRealtimeUsers() {
  const { user } = useUser()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    // First, load from localStorage/API as fallback
    const fetchUsers = async () => {
      try {
        const token = getToken() || 'mock-token-for-testing'
        const API_URL = (import.meta as any).env?.VITE_API_URL || '/api'
        
        // Try to fetch real users from API
        try {
          const response = await axios.get(`${API_URL}/auth/users`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          if (response.data && response.data.length > 0) {
            const mappedUsers = response.data.map((u: any) => ({
              id: u.id || u._id,
              userId: u.userId,
              name: u.name,
              email: u.email,
              role: u.role === 'admin' ? 'Admin' : 'User',
              status: 'Active',
              createdAt: new Date().toISOString()
            }))
            setUsers(mappedUsers)
            setJSON(ADMIN_USERS_KEY, mappedUsers)
            setLoading(false)
            return
          }
        } catch (apiError) {
          console.warn('API fetch failed, trying localStorage:', apiError)
        }
        
        // Fallback to localStorage
        const localUsers = getJSON<any[]>(ADMIN_USERS_KEY, []) || []
        if (localUsers.length > 0) {
          setUsers(localUsers)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
        setLoading(false)
      }
    }
    
    fetchUsers()

    // Update current user's presence
    try {
      updateUserPresence(user.id, true)
    } catch (error) {
      console.warn('Error updating user presence:', error)
    }

    // Subscribe to all users from Firestore
    try {
      const unsubscribe = subscribeToUsers((updatedUsers) => {
        if (updatedUsers && updatedUsers.length > 0) {
          const mappedUsers = updatedUsers.map((u: any) => ({
            id: u.id,
            userId: u.userId || u.id,
            name: u.name || u.email,
            email: u.email,
            role: u.role === 'admin' ? 'Admin' : 'User',
            status: u.isOnline ? 'Active' : (u.status || 'Active'),
            createdAt: u.createdAt || new Date().toISOString()
          }))
          setUsers(mappedUsers)
          setJSON(ADMIN_USERS_KEY, mappedUsers)
        }
        setLoading(false)
      })

      // Cleanup: mark user as offline when component unmounts
      return () => {
        if (user?.id) {
          try {
            updateUserPresence(user.id, false)
          } catch (error) {
            console.warn('Error updating user presence on unmount:', error)
          }
        }
        unsubscribe()
      }
    } catch (error) {
      console.error('Error subscribing to Firestore users:', error)
      setLoading(false)
      // Continue with localStorage/API users only
    }
  }, [user?.id])

  return { users, loading }
}

