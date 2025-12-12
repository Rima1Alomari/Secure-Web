import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import VideoRoom from './pages/VideoRoom'
import FileManager from './pages/FileManager'
import SharePage from './pages/SharePage'
import EditorView from './pages/EditorView'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login onLogin={() => {}} />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/video/:channelName" element={<VideoRoom />} />
      <Route path="/files" element={<FileManager />} />
      <Route path="/share/:token" element={<SharePage />} />
      <Route path="/editor/:fileId" element={<EditorView />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App

