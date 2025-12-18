import { Navigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'

/**
 * Component that redirects users to role-specific pages
 */
export default function RoleBasedRedirect() {
  const { role } = useUser()

  // Determine redirect path based on role
  let redirectPath = '/dashboard' // Default path

  switch (role) {
    case 'admin':
      redirectPath = '/administration'
      break
    case 'security':
      redirectPath = '/security'
      break
    case 'user':
    default:
      redirectPath = '/dashboard'
      break
  }

  return <Navigate to={redirectPath} replace />
}

