import { Navigate, useLocation } from 'react-router-dom'
import { useUser, UserRole } from '../contexts/UserContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo,
}: ProtectedRouteProps) {
  const { role } = useUser()
  const location = useLocation()

  // If no allowedRoles specified, allow all authenticated users
  if (!allowedRoles) {
    return <>{children}</>
  }

  // Check if user's role is in allowed roles
  if (!allowedRoles.includes(role)) {
    // Determine redirect path based on user role
    let defaultRedirect = '/dashboard' // Default for all users
    
    // Redirect based on role
    switch (role) {
      case 'admin':
        defaultRedirect = '/administration'
        break
      case 'security':
        defaultRedirect = '/security'
        break
      case 'user':
      default:
        defaultRedirect = '/dashboard'
        break
    }
    
    // Use provided redirectTo or role-based default
    const finalRedirect = redirectTo || defaultRedirect
    
    // Log access denied for debugging
    console.warn(`Access denied: User with role '${role}' tried to access route that requires: ${allowedRoles.join(', ')}`)
    
    // Redirect to appropriate page based on role
    return <Navigate to={finalRedirect} state={{ from: location }} replace />
  }

  return <>{children}</>
}


