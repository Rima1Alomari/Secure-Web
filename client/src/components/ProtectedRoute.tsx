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
  redirectTo = '/dashboard',
}: ProtectedRouteProps) {
  const { role } = useUser()
  const location = useLocation()

  // If no allowedRoles specified, allow all authenticated users
  if (!allowedRoles) {
    return <>{children}</>
  }

  // Check if user's role is in allowed roles
  if (!allowedRoles.includes(role)) {
    // Redirect to dashboard or specified redirect path
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  return <>{children}</>
}

