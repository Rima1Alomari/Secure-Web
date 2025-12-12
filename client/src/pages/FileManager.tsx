import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { getToken } from '../utils/auth'
import { FaArrowLeft, FaDownload, FaShare, FaEdit, FaTrash } from 'react-icons/fa'
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

    const token = getToken()
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
      const token = getToken()
      if (!token) {
        navigate('/login')
        return
      }
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
      const token = getToken()
      
      if (!token) {
        setNotification({ message: 'Please login to upload files', type: 'error' })
        navigate('/login')
        return
      }

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
      const token = getToken()
      if (!token) {
        navigate('/login')
        return
      }
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
      const token = getToken()
      if (!token) {
        navigate('/login')
        return
      }
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
      const token = getToken()
      if (!token) {
        navigate('/login')
        return
      }
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
    const token = getToken()
    if (!token) {
      navigate('/login')
      return
    }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <nav className="bg-white border-b border-blue-200 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-green-600 transition-colors rounded-lg hover:bg-blue-50 font-semibold"
            >
              <FaArrowLeft /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              File Manager
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      {notification && (
        <div
          className={`fixed top-4 right-4 px-6 py-4 rounded-xl shadow-2xl z-50 border-2 ${
            notification.type === 'success' 
              ? 'bg-green-50 border-green-500 text-green-700' 
              : 'bg-red-50 border-red-500 text-red-700'
          } animate-fade-in`}
        >
          {notification.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 mb-8 bg-white ${
            isDragActive
              ? 'border-green-500 bg-green-50 border-solid'
              : 'border-blue-300 hover:border-green-400 bg-white hover:bg-blue-50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''} shadow-lg`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div>
              <div className="text-lg font-semibold mb-2">Uploading... {progress}%</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xl mb-2 text-gray-800 font-semibold">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-gray-600">or click to select files</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-8">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
              <FaFile className="text-blue-600 text-3xl" />
            </div>
            <p className="text-gray-600 text-lg">No files uploaded yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-blue-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-500 to-green-500">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Size</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.map((file) => (
                  <tr key={file._id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800">{file.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatSize(file.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleDownload(file)}
                          className="text-blue-600 hover:text-blue-700 transition-colors p-2 hover:bg-blue-100 rounded-lg"
                          title="Download"
                        >
                          <FaDownload className="text-lg" />
                        </button>
                        <button
                          onClick={() => handleShare(file)}
                          className="text-green-600 hover:text-green-700 transition-colors p-2 hover:bg-green-100 rounded-lg"
                          title="Share"
                        >
                          <FaShare className="text-lg" />
                        </button>
                        {canEdit(file) && (
                          <button
                            onClick={() => handleEdit(file)}
                            className="text-blue-600 hover:text-blue-700 transition-colors p-2 hover:bg-blue-100 rounded-lg"
                            title="Edit"
                          >
                            <FaEdit className="text-lg" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(file._id)}
                          className="text-red-600 hover:text-red-700 transition-colors p-2 hover:bg-red-100 rounded-lg"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full border-2 border-blue-200 shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Share File</h2>
            <p className="text-gray-600 mb-6 font-semibold">{shareModal.file.name}</p>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareModal.shareLink}
                  readOnly
                  className="flex-1 px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-xl text-gray-800"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareModal.shareLink)
                    alert('Link copied!')
                  }}
                  className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-all shadow-lg hover:scale-105"
                >
                  Copy
                </button>
              </div>
            </div>
            <button
              onClick={() => setShareModal({ file: null, shareLink: '' })}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-md"
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

