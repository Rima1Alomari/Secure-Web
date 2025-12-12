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
import Chat from './pages/Chat'
import Calendar from './pages/Calendar'
import Recent from './pages/Recent'
import TrashBin from './pages/TrashBin'
import Administration from './pages/Administration'
import Layout from './components/Layout'

function App() {
  // Temporarily disabled authentication for testing
  // const token = getToken()
  // const isAuthenticated = !!token
  const isAuthenticated = true // Always allow access for now

  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={() => {}} />} />
      <Route path="/register" element={<Register />} />
      <Route path="/share/:token" element={<SharePage />} />
      
      {/* Protected Routes with Layout - Temporarily open for testing */}
      <Route
        path="/*"
        element={
          <Layout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/video/:channelName" element={<VideoRoom />} />
              <Route path="/files" element={<FileManager />} />
              <Route path="/editor/:fileId" element={<EditorView />} />
              <Route path="/security" element={<SecurityCenter />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/recent" element={<Recent />} />
              <Route path="/trash" element={<TrashBin />} />
              <Route path="/administration" element={<Administration />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        }
      />
    </Routes>
  )
}

export default App

