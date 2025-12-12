import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getToken } from '../utils/auth'
import { FaArrowLeft } from 'react-icons/fa'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const DOCUMENT_SERVER_URL = import.meta.env.VITE_DOCUMENT_SERVER_URL || 'http://localhost:8080'

const EditorView = () => {
  const { fileId } = useParams<{ fileId: string }>()
  const [editorConfig, setEditorConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (fileId) {
      initializeEditor()
    }
  }, [fileId])

  const initializeEditor = async () => {
    try {
      const token = getToken()
      const response = await axios.get(`${API_URL}/files/${fileId}/editor-config`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setEditorConfig(response.data)
    } catch (error) {
      console.error('Error initializing editor:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading editor...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b p-4">
        <button
          onClick={() => navigate('/files')}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <FaArrowLeft /> Back to Files
        </button>
      </div>
      <div className="h-[calc(100vh-80px)]">
        {editorConfig ? (
          <iframe
            src={`${DOCUMENT_SERVER_URL}/web-apps/apps/api/documents/api.js`}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="OnlyOffice Editor"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-600">Editor configuration not available</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorView

