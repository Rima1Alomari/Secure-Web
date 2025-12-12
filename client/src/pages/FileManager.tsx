import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { getToken } from '../utils/auth'
import { FaArrowLeft, FaDownload, FaShare, FaEdit, FaTrash, FaRobot, FaSearch, FaTags, FaFileAudio } from 'react-icons/fa'
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || '/api'

interface File {
  _id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  owner: string
}

const FileManager = () => {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [shareModal, setShareModal] = useState<{ file: File | null; shareLink: string }>({ file: null, shareLink: '' })
  const navigate = useNavigate()

  useEffect(() => {
    fetchFiles()

    // Temporarily disabled auth for testing
    const token = getToken() || 'mock-token'
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token }
    })

    socket.on('file-uploaded', (data) => {
      setNotification({ message: `File "${data.name}" uploaded`, type: 'success' })
      fetchFiles()
    })

    socket.on('file-deleted', (data) => {
      setNotification({ message: `File "${data.name}" deleted`, type: 'success' })
      fetchFiles()
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const fetchFiles = async () => {
    try {
      const token = getToken() || 'mock-token'
      const response = await axios.get(`${API_URL}/files`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setFiles(response.data)
    } catch (error) {
      console.error('Error fetching files:', error)
    } finally {
      setLoading(false)
    }
  }

  const onDrop = async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      await uploadFile(file)
    }
  }

  const uploadFile = async (file: File) => {
    try {
      setUploading(true)
      setProgress(0)
      const token = getToken() || 'mock-token'

      const response = await axios.post(
        `${API_URL}/files/upload-url`,
        { fileName: file.name, fileType: file.type },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (!response.data.uploadUrl || !response.data.s3Key) {
        throw new Error('Invalid upload response')
      }

      const { uploadUrl, s3Key } = response.data

      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setProgress(percent)
          }
        }
      })

      await axios.post(
        `${API_URL}/files/complete-upload`,
        { s3Key, fileName: file.name, fileType: file.type, fileSize: file.size },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      fetchFiles()
      setProgress(0)
      setNotification({ message: `File "${file.name}" uploaded successfully`, type: 'success' })
    } catch (error: any) {
      console.error('Upload error:', error)
      setNotification({ message: error.response?.data?.error || 'Upload failed', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading
  })

  const handleDownload = async (file: File) => {
    try {
      const token = getToken() || 'mock-token'
      const response = await axios.get(`${API_URL}/files/${file._id}/download-url`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to download file')
    }
  }

  const handleShare = async (file: File) => {
    try {
      const token = getToken() || 'mock-token'
      const response = await axios.post(
        `${API_URL}/files/${file._id}/share`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (response.data.shareToken) {
        const shareUrl = `${window.location.origin}/share/${response.data.shareToken}`
        setShareModal({ file, shareLink: shareUrl })
      }
    } catch (error) {
      console.error('Share error:', error)
      alert('Failed to share file')
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return

    try {
      const token = getToken() || 'mock-token'
      await axios.delete(`${API_URL}/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchFiles()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete file')
    }
  }

  const handleEdit = (file: File) => {
    // Temporarily disabled auth check
    navigate(`/editor/${file._id}`)
  }

  const canEdit = (file: File) => {
    const officeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
    return officeTypes.includes(file.type)
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div>

      {notification && (
        <div
          className={`fixed top-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-50 border-2 ${
            notification.type === 'success' 
              ? 'bg-green-500/20 backdrop-blur-xl border-green-500 text-green-300' 
              : 'bg-red-500/20 backdrop-blur-xl border-red-500 text-red-300'
          } animate-fade-in`}
        >
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* AI Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* AI File Search (NLP) */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FaSearch className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI File Search</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Natural language file search</p>
            <input
              type="text"
              placeholder="Search files by content..."
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border-2 border-blue-200/50 dark:border-blue-800/50 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* AI Auto-Tagging */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <FaTags className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Auto-Tagging</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Automatic file categorization</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300 font-medium">Document</span>
              <span className="px-3 py-1 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300 font-medium">Project</span>
            </div>
          </div>

          {/* AI Transcription Storage */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 rounded-xl flex items-center justify-center">
                <FaFileAudio className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Transcription</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Auto-transcribe audio/video files</p>
            <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg hover:scale-105">
              Enable Transcription
            </button>
          </div>
        </div>

        <div
          {...getRootProps()}
          className={`border-3 border-dashed rounded-2xl p-10 md:p-14 text-center cursor-pointer transition-all duration-300 mb-8 bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-blue-300/50 dark:border-blue-700/50 ${
            isDragActive
              ? 'border-green-500 dark:border-green-400 border-solid bg-gradient-to-br from-green-50 via-green-50/50 to-blue-50/50 dark:from-green-900/30 dark:via-green-900/20 dark:to-blue-900/20 shadow-2xl shadow-green-500/20'
              : 'hover:border-green-500 dark:hover:border-green-400 hover:shadow-xl hover:shadow-blue-500/10'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div>
              <div className="text-lg font-semibold mb-2">Uploading... {progress}%</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-600 via-blue-500 to-green-600 dark:from-blue-500 dark:via-blue-400 dark:to-green-500 h-3 rounded-full transition-all shadow-lg"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xl mb-2 text-gray-900 dark:text-white font-semibold">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-gray-600 dark:text-gray-300">or click to select files</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-900 dark:text-white">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-16 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 dark:from-blue-500 dark:via-blue-400 dark:to-green-500 rounded-2xl mb-6 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10">
              <FaFile className="text-white text-4xl" />
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-xl font-semibold">No files uploaded yet</p>
          </div>
        ) : (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gradient-to-r from-blue-50 via-blue-50/50 to-green-50 dark:from-gray-700 dark:via-gray-700 dark:to-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {files.map((file) => (
                  <tr key={file._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {formatSize(file.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleDownload(file)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          title="Download"
                        >
                          <FaDownload className="text-lg" />
                        </button>
                        <button
                          onClick={() => handleShare(file)}
                          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                          title="Share"
                        >
                          <FaShare className="text-lg" />
                        </button>
                        {canEdit(file) && (
                          <button
                            onClick={() => handleEdit(file)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            title="Edit"
                          >
                            <FaEdit className="text-lg" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(file._id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Delete"
                        >
                          <FaTrash className="text-lg" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {shareModal.file && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border-2 border-blue-200/50 dark:border-blue-800/50 shadow-2xl shadow-blue-500/20">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Share File</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6 font-semibold">{shareModal.file.name}</p>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareModal.shareLink}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareModal.shareLink)
                    alert('Link copied!')
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 via-green-500 to-green-600 hover:from-green-700 hover:via-green-600 hover:to-green-700 dark:from-green-500 dark:via-green-400 dark:to-green-500 text-white rounded-xl font-bold transition-all shadow-xl shadow-green-500/30 hover:shadow-2xl hover:scale-105 transform"
                >
                  Copy
                </button>
              </div>
            </div>
            <button
              onClick={() => setShareModal({ file: null, shareLink: '' })}
              className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-green-600 hover:from-blue-700 hover:via-blue-600 hover:to-green-700 dark:from-blue-500 dark:via-blue-400 dark:to-green-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:scale-105 transform"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileManager

