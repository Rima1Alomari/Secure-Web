import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import { ScreenshotProtection as ScreenshotProtectionClass } from '../utils/screenshotProtection'

/**
 * Screenshot Protection Component
 * Prevents non-admin users from taking screenshots and logs attempts
 */
export default function ScreenshotProtection() {
  const { user, role } = useUser()
  const location = useLocation()
  const protectionRef = useRef<ScreenshotProtectionClass | null>(null)

  useEffect(() => {
    if (!user) return

    const isAdmin = role === 'admin'
    const protection = new ScreenshotProtectionClass(
      isAdmin,
      user.id || 'unknown',
      user.name || 'Unknown User'
    )

    // Set current location
    protection.setLocation(location.pathname)

    // Initialize protection (only for non-admins)
    if (!isAdmin) {
      protection.initialize()
    }

    protectionRef.current = protection

    // Update location when route changes
    const handleLocationChange = () => {
      if (protectionRef.current) {
        protectionRef.current.setLocation(location.pathname)
      }
    }

    // Listen for route changes
    const unsubscribe = () => {
      // Cleanup handled by useEffect cleanup
    }

    return () => {
      if (protectionRef.current) {
        protectionRef.current.destroy()
      }
    }
  }, [user, role, location.pathname])

  // Update location when it changes
  useEffect(() => {
    if (protectionRef.current) {
      protectionRef.current.setLocation(location.pathname)
    }
  }, [location.pathname])

  // This component doesn't render anything
  return null
}

