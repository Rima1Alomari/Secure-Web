import { Routes, Route, Navigate } from 'react-router-dom'
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

function App() {
  // Temporarily disabled authentication for testing
  // const token = getToken()
  // const isAuthenticated = !!token
  const isAuthenticated = true // Always allow access for now

  return (
    <ErrorBoundary>
      <UserProvider>
        <Routes>
          <Route path="/login" element={<Login onLogin={() => {}} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/share/:token" element={<SharePage />} />
          
          {/* Protected Routes with Layout */}
          <Route
            path="/*"
            element={
              <Layout>
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
                      <ProtectedRoute allowedRoles={['user', 'admin']}>
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
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </UserProvider>
    </ErrorBoundary>
  )
}

export default App

