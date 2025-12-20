import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { saveUser, updateUserPresence } from '../services/firestore'

export type UserRole = 'user' | 'admin'

interface User {
  id: string
  userId?: string // Unique user ID like #AD001, #US001, #SE001
  name: string
  email: string
  role: UserRole
}

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  role: UserRole
  hasRole: (requiredRole: UserRole | UserRole[]) => boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

const USER_STORAGE_KEY = 'secure-web-user'
const DEFAULT_ROLE: UserRole = 'user' // Default role for new users

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    // Load user from localStorage on mount
    try {
      const stored = localStorage.getItem(USER_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error)
    }
    // Return null if no user stored (will require login)
    return null
  })

  const setUser = async (newUser: User | null) => {
    setUserState(newUser)
    if (newUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser))
      
      // Save user to Firestore for real-time sync
      try {
        await saveUser({
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          isOnline: true
        })
        
        // Update presence
        await updateUserPresence(newUser.id, true)
      } catch (error) {
        console.error('Error saving user to Firestore:', error)
        // Continue even if Firestore save fails
      }
    } else {
      localStorage.removeItem(USER_STORAGE_KEY)
      
      // Mark user as offline in Firestore
      if (user?.id) {
        try {
          await updateUserPresence(user.id, false)
        } catch (error) {
          console.error('Error updating user presence:', error)
        }
      }
    }
  }

  // Update presence when component unmounts
  useEffect(() => {
    return () => {
      if (user?.id) {
        updateUserPresence(user.id, false).catch(console.error)
      }
    }
  }, [user?.id])

  const role = user?.role || DEFAULT_ROLE

  const hasRole = (requiredRole: UserRole | UserRole[]): boolean => {
    if (!user) return false
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role)
    }
    return user.role === requiredRole
  }

  return (
    <UserContext.Provider value={{ user, setUser, role, hasRole }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}


