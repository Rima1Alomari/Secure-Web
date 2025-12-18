import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import VideoRoom from './pages/VideoRoom'
import FileManager from './pages/FileManager'
import SharePage from './pages/SharePage'
import EditorView from './pages/EditorView'
import SecurityCenter from './pages/SecurityCenter'
import Rooms from './pages/Rooms'
import RoomDetails from './pages/RoomDetails'
import Chat from './pages/Chat'
import Calendar from './pages/Calendar'
import Recent from './pages/Recent'
import TrashBin from './pages/TrashBin'
import Administration from './pages/Administration'
import AboutUs from './pages/AboutUs'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import { UserProvider } from './contexts/UserContext'
import ProtectedRoute from './components/ProtectedRoute'
import RoleBasedRedirect from './components/RoleBasedRedirect'
import ScreenshotProtection from './components/ScreenshotProtection'
import { getToken, isAuthenticated as checkAuth } from './utils/auth'

function App() {
  const [authChecked, setAuthChecked] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    // Check authentication status on mount
    const token = getToken()
    setAuthenticated(!!token)
    setAuthChecked(true)
  }, [])

  const handleLogin = () => {
    setAuthenticated(true)
  }

  const handleLogout = () => {
    setAuthenticated(false)
  }

  // Show loading state while checking authentication
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <UserProvider>
        <ScreenshotProtection />
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={
              authenticated ? (
                <RoleBasedRedirect />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />
          <Route 
            path="/register" 
            element={
              authenticated ? (
                <RoleBasedRedirect />
              ) : (
                <Register />
              )
            } 
          />
          <Route path="/share/:token" element={<SharePage />} />
          
          {/* Protected Routes with Layout */}
          <Route
            path="/*"
            element={
              authenticated ? (
                <Layout onLogout={handleLogout}>
                  <Routes>
                  {/* User routes: Dashboard, Rooms, Chat, Calendar, Files, Recent, Trash */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute allowedRoles={['user', 'admin', 'security']}>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/rooms" 
                    element={
                      <ProtectedRoute allowedRoles={['user', 'admin']}>
                        <Rooms />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/rooms/:id" 
                    element={
                      <ProtectedRoute allowedRoles={['user', 'admin']}>
                        <RoomDetails />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/chat" 
                    element={
                      <ProtectedRoute allowedRoles={['user', 'admin']}>
                        <Chat />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/calendar" 
                    element={
                      <ProtectedRoute allowedRoles={['user', 'admin']}>
                        <Calendar />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/files" 
                    element={
                      <ProtectedRoute allowedRoles={['user', 'admin']}>
                        <FileManager />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/recent" 
                    element={
                      <ProtectedRoute allowedRoles={['user', 'admin']}>
                        <Recent />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/trash" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <TrashBin />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Security routes: Security (admin + security), Administration (admin only) */}
                  <Route 
                    path="/security" 
                    element={
                      <ProtectedRoute allowedRoles={['admin', 'security']}>
                        <SecurityCenter />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/administration" 
                    element={
                      <ProtectedRoute allowedRoles={['admin']}>
                        <Administration />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Other routes */}
                  <Route path="/video/:channelName" element={<VideoRoom />} />
                  <Route path="/editor/:fileId" element={<EditorView />} />
                  <Route path="/" element={<RoleBasedRedirect />} />
                </Routes>
              </Layout>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </UserProvider>
    </ErrorBoundary>
  )
}

export default App

