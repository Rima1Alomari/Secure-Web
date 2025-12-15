import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

export type UserRole = 'user' | 'admin' | 'security'

interface User {
  id: string
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
    // Default user for testing
    return {
      id: 'default-user',
      name: 'Demo User',
      email: 'user@example.com',
      role: DEFAULT_ROLE,
    }
  })

  const setUser = (newUser: User | null) => {
    setUserState(newUser)
    if (newUser) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser))
    } else {
      localStorage.removeItem(USER_STORAGE_KEY)
    }
  }

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


