import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { setToken } from '../utils/auth'
import { useUser } from '../contexts/UserContext'
import { FaShieldAlt, FaEnvelope, FaLock, FaSignInAlt, FaArrowRight, FaEye, FaEyeSlash } from 'react-icons/fa'

const API_URL = import.meta.env.VITE_API_URL || '/api'

interface LoginProps {
  onLogin: () => void
}

const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser } = useUser()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      })

      if (response.data.token && response.data.user) {
        // Save token
        setToken(response.data.token)
        
        // Get user role
        const userRole = response.data.user.role || 'user'
        
        // Set user data in context
        setUser({
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          role: userRole
        })
        
        // Notify parent component
        onLogin()
        
        // Navigate based on user role
        let redirectPath = '/dashboard' // Default path
        
        switch (userRole) {
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
        
        // Navigate to role-specific page
        navigate(redirectPath)
      } else {
        setError('Login failed: No token or user data received')
      }
    } catch (err: any) {
      console.error('Login error:', err)
      
      // Handle 403 errors specifically
      if (err.response?.status === 403) {
        setError('Access denied. Please try again or create a new account if you don\'t have one.')
      } else if (err.response?.status === 401) {
        // Check if it's because user doesn't exist
        const errorMsg = err.response?.data?.error || ''
        if (errorMsg.includes('Invalid credentials') || errorMsg.includes('not found')) {
          setError('Account not found. Please create a new account or check your email and password.')
        } else {
          setError(errorMsg || 'Invalid email or password. Please try again.')
        }
      } else {
        const errorMessage = err.response?.data?.error || err.message || 'Login failed. Please check your credentials or create a new account.'
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/50 to-green-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 rounded-2xl mb-6 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10">
            <FaShieldAlt className="text-white text-4xl" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent mb-3 tracking-tight">
            Secure Web
          </h1>
          <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-2xl shadow-blue-500/20 p-8 md:p-10 border-2 border-blue-200/50 dark:border-blue-800/50">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-6">
              <div className="flex items-start gap-2">
                <FaShieldAlt className="text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{error}</p>
                  {(error.includes('not found') || error.includes('Account not found')) && (
                    <Link
                      to="/register"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                    >
                      Create a new account →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaEnvelope className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-12 py-3.5 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span>Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <FaSignInAlt /> Sign In <FaArrowRight />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-blue-600 dark:text-blue-400 hover:text-green-600 dark:hover:text-green-400 font-semibold transition-colors inline-flex items-center gap-1"
              >
                Sign up <FaArrowRight className="text-xs" />
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mt-6">
          Secure • Fast • Reliable
        </p>
      </div>
    </div>
  )
}

export default Login
