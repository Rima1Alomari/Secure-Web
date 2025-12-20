import { useState, useEffect } from 'react'
import { subscribeToUsers, saveUser, updateUserPresence } from '../services/firestore'
import { useUser } from '../contexts/UserContext'

export function useRealtimeUsers() {
  const { user } = useUser()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    // Update current user's presence
    updateUserPresence(user.id, true)

    // Subscribe to all users
    const unsubscribe = subscribeToUsers((updatedUsers) => {
      setUsers(updatedUsers)
      setLoading(false)
    })

    // Cleanup: mark user as offline when component unmounts
    return () => {
      if (user?.id) {
        updateUserPresence(user.id, false)
      }
      unsubscribe()
    }
  }, [user?.id])

  return { users, loading }
}

