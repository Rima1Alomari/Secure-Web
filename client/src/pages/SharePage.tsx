import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { FaDownload, FaLock, FaFile } from 'react-icons/fa'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const SharePage = () => {
  const { token } = useParams<{ token: string }>()
  const [file, setFile] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')

  useEffect(() => {
    if (token) {
      fetchFileInfo()
    }
  }, [token])

  const fetchFileInfo = async () => {
    try {
      const response = await axios.get(`${API_URL}/share/${token}`)
      setFile(response.data)
      if (!response.data.passwordProtected) {
        setDownloadUrl(response.data.downloadUrl)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load file')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await axios.post(`${API_URL}/share/${token}/verify`, {
        password
      })
      setDownloadUrl(response.data.downloadUrl)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid password')
    }
  }

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="text-gray-600 text-xl">Loading...</div>
      </div>
    )
  }

  if (error && !file) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="bg-red-50 border-2 border-red-500 text-red-700 px-6 py-4 rounded-xl">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-2 border-green-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl mb-4 shadow-lg">
            <FaFile className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Shared File</h1>
        </div>

        {file && (
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
            <p className="text-lg font-semibold text-gray-800 mb-2">{file.name}</p>
            <p className="text-gray-600 text-sm">Size: {(file.size / 1024).toFixed(2)} KB</p>
          </div>
        )}

        {file?.passwordProtected && !downloadUrl && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FaLock /> Password Required
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-green-50 border-2 border-green-200 rounded-xl text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                placeholder="Enter password"
              />
            </div>
            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/50 transform hover:scale-[1.02]"
            >
              Unlock File
            </button>
          </form>
        )}

        {downloadUrl && (
          <button
            onClick={handleDownload}
            className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/50 flex items-center justify-center gap-2 transform hover:scale-[1.02]"
          >
            <FaDownload /> Download File
          </button>
        )}
      </div>
    </div>
  )
}

export default SharePage
