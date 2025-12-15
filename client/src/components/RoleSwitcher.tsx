import { useUser, UserRole } from '../contexts/UserContext'

/**
 * Role Switcher Component - For testing/demo purposes
 * Allows switching between user roles to test role-based access control
 * This should be removed or hidden in production
 */
export default function RoleSwitcher() {
  const { user, setUser, role } = useUser()

  const roles: UserRole[] = ['user', 'admin', 'security']

  const handleRoleChange = (newRole: UserRole) => {
    if (user) {
      setUser({
        ...user,
        role: newRole,
      })
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border-2 border-blue-200/50 dark:border-blue-800/50 rounded-xl p-4 shadow-xl shadow-blue-500/10">
      <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Role: <span className="text-blue-600 dark:text-blue-400 font-bold">{role}</span>
      </div>
      <div className="flex flex-col gap-2">
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => handleRoleChange(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              role === r
                ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}

