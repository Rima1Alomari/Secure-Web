import { useEffect, useState, useMemo, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { 
  FaDownload, 
  FaEdit, 
  FaUpload, 
  FaFile,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileImage,
  FaFileVideo,
  FaFileAlt,
  FaFolder,
  FaTag,
  FaStickyNote,
  FaLock,
  FaUserCheck,
  FaUserTimes
} from 'react-icons/fa'
import { Modal, Toast } from '../components/common'
import { getJSON, setJSON, nowISO } from '../data/storage'
import { ROOMS_KEY, FILES_KEY } from '../data/keys'
import { FileItem, Room } from '../types/models'
import { useUser } from '../contexts/UserContext'
import { trackFileOpened } from '../utils/recentTracker'
import { getToken } from '../utils/auth'
import { auditHelpers, logAuditEvent } from '../utils/audit'

const API_URL = (import.meta as any).env.VITE_API_URL || '/api'

const FileManager = () => {
  const { role, user } = useUser()
  const isAdmin = role === 'admin'
  
  const [files, setFiles] = useState<FileItem[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [userActionTriggered, setUserActionTriggered] = useState(false)
  
  // Modal states
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [showInstructionModal, setShowInstructionModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showClassificationModal, setShowClassificationModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  
  // Form states
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [labelValue, setLabelValue] = useState<'Important' | 'Action' | 'Plan' | 'FYI' | ''>('')
  const [instructionValue, setInstructionValue] = useState('')
  const [fileClassification, setFileClassification] = useState<'Normal' | 'Confidential' | 'Restricted'>('Normal')
  const [filePermissions, setFilePermissions] = useState<{
    canView: string[]
    canEdit: string[]
    canDownload: string[]
    canDelete: string[]
  }>({
    canView: [],
    canEdit: [],
    canDownload: [],
    canDelete: []
  })
  
  // File upload queue
  const [fileUploadQueue, setFileUploadQueue] = useState<Array<{ file: globalThis.File; classification: 'Normal' | 'Confidential' | 'Restricted' }>>([])
  const [currentUploadFile, setCurrentUploadFile] = useState<globalThis.File | null>(null)
  
  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Map backend file to FileItem interface
  const mapBackendFileToFileItem = (backendFile: any): FileItem & { _backendId?: string } => {
    const ownerName = backendFile.owner?.name || 
                     (typeof backendFile.owner === 'string' ? backendFile.owner : null) ||
                     backendFile.ownerName || 
                     'Unknown'
    
    const ownerId = backendFile.owner?._id?.toString() || 
                   (typeof backendFile.owner === 'string' ? backendFile.owner : null) ||
                   backendFile.owner?.toString() || 
                   backendFile.ownerId

    return {
      id: backendFile._id || backendFile.id,
      name: backendFile.name,
      size: backendFile.size,
      type: backendFile.type,
      uploadedAt: backendFile.createdAt || backendFile.uploadedAt || new Date().toISOString(),
      owner: ownerName,
      ownerId: ownerId,
      isTrashed: false,
      isFolder: false,
      // Store backend file reference for API calls
      _backendId: backendFile._id || backendFile.id,
    }
  }

  // Detect demo mode (check if backend is disconnected)
  useEffect(() => {
    // Check if we're in demo mode by attempting a lightweight API call
    // or by checking environment/localStorage
    const checkDemoMode = async () => {
      try {
        const token = getToken() || 'mock-token-for-testing'
        // Try a lightweight health check or just assume demo mode if token is mock
        if (token === 'mock-token-for-testing') {
          setIsDemoMode(true)
          return
        }
        // Optional: Try a health check endpoint if available
        // For now, we'll detect demo mode based on token
        setIsDemoMode(false)
      } catch {
        setIsDemoMode(true)
      }
    }
    checkDemoMode()
  }, [])

  // Load rooms from localStorage on mount (no API call)
  useEffect(() => {
    const savedRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    setRooms(savedRooms)
    // Load files from localStorage as fallback
    const localFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
    if (localFiles.length > 0) {
      setFiles(localFiles)
    }
  }, [])

  // Fetch files function (called explicitly, not on mount)
  const fetchFiles = async (showErrors = false) => {
    // Skip API call in demo mode
    if (isDemoMode) {
      const localFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
      setFiles(localFiles)
      setLoading(false)
      return
    }

      try {
        setLoading(true)
        const token = getToken() || 'mock-token-for-testing'
        const response = await axios.get(`${API_URL}/files`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        const backendFiles = response.data || []
        const mappedFiles = backendFiles.map(mapBackendFileToFileItem)
        setFiles(mappedFiles)
      } catch (error: any) {
        console.error('Error fetching files:', error)
      
      // Only show error toast if:
      // 1. User explicitly triggered the action (showErrors = true)
      // 2. Error is NOT a 403 on page entry (userActionTriggered = true)
      const is403 = error.response?.status === 403
      const shouldShowError = showErrors && (userActionTriggered || !is403)
      
      if (shouldShowError) {
        const errorMessage = error.response?.data?.error || 
                            error.message || 
                            'Failed to load files. Make sure the server and database are running.'
        setToast({ 
          message: errorMessage, 
          type: 'error' 
        })
      } else if (is403 && !userActionTriggered) {
        // Silent console warning for 403 on page entry
        console.warn('Files API returned 403. Running in demo mode. Use localStorage files.')
        setIsDemoMode(true)
      }
      
      // Fallback to localStorage files
      const localFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
      setFiles(localFiles)
      } finally {
        setLoading(false)
      setUserActionTriggered(false)
    }
  }

  // Fetch files when room is selected (if not demo mode and not initial mount)
  useEffect(() => {
    // Only fetch if room is explicitly selected (not 'all' and not initial mount)
    if (selectedRoomId !== 'all' && !isDemoMode) {
      setUserActionTriggered(true)
      fetchFiles(true)
    } else if (selectedRoomId !== 'all' && isDemoMode) {
      // In demo mode, just filter localStorage files
      const localFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
      const filtered = localFiles.filter(file => 
        file.roomId === selectedRoomId || file.sharedWith?.includes(selectedRoomId)
      )
      setFiles(filtered.length > 0 ? filtered : localFiles)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoomId])


  // Filter files by selected room (if roomId is set, otherwise show all)
  const roomFiles = useMemo(() => {
    if (selectedRoomId === 'all') {
      return files
    }
    // Filter by roomId if files have it, otherwise show all files
    const filtered = files.filter(file => file.roomId === selectedRoomId || file.sharedWith?.includes(selectedRoomId))
      // If no files match the room filter, show all files (backend files don't have roomId yet)
    return filtered.length > 0 ? filtered : files
  }, [files, selectedRoomId])
    
  const { getInputProps } = useDropzone({
    onDrop: async (acceptedFiles: globalThis.File[]) => {
      if (!isAdmin) {
        setToast({ message: 'Only admins can upload files', type: 'error' })
        return
      }
      
      // If only one file, show classification modal immediately
      if (acceptedFiles.length === 1) {
        setCurrentUploadFile(acceptedFiles[0])
        setFileClassification('Normal')
        setShowClassificationModal(true)
      } else {
        // For multiple files, process them one by one
        setCurrentUploadFile(acceptedFiles[0])
        setFileClassification('Normal')
        setShowClassificationModal(true)
        // Store remaining files in queue
        setFileUploadQueue(acceptedFiles.slice(1).map(file => ({ file, classification: 'Normal' as const })))
      }
    },
    disabled: !isAdmin
  })

  const handleClassificationConfirm = async () => {
    if (!currentUploadFile) return
    
    // Upload the current file with selected classification
    await uploadFile(currentUploadFile, fileClassification)
    
    // Process next file in queue if any
    if (fileUploadQueue.length > 0) {
      const nextFile = fileUploadQueue[0].file
      setCurrentUploadFile(nextFile)
      setFileClassification('Normal')
      setFileUploadQueue(prev => prev.slice(1))
      // Keep modal open for next file
    } else {
      // No more files, close modal
      setShowClassificationModal(false)
      setCurrentUploadFile(null)
      setFileClassification('Normal')
    }
  }

  const handleClassificationCancel = () => {
    // Skip current file and process next
    if (fileUploadQueue.length > 0) {
      const nextFile = fileUploadQueue[0].file
      setCurrentUploadFile(nextFile)
      setFileClassification('Normal')
      setFileUploadQueue(prev => prev.slice(1))
    } else {
      setShowClassificationModal(false)
      setCurrentUploadFile(null)
      setFileClassification('Normal')
    }
  }

  const uploadFile = async (file: globalThis.File, classification: 'Normal' | 'Confidential' | 'Restricted' = fileClassification) => {
    setUserActionTriggered(true) // Mark as user action
    try {
      const token = getToken() || 'mock-token-for-testing'
      
      // Skip API call in demo mode
      if (isDemoMode) {
        // Save to localStorage
        const newFileItem: FileItem = {
          id: `local-${Date.now()}-${file.name}`,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: nowISO(),
          owner: user?.name || 'You',
          ownerId: user?.id,
          roomId: selectedRoomId !== 'all' ? selectedRoomId : undefined,
          isTrashed: false,
          isFolder: false,
          classification: classification
        }
        const allFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
        setJSON(FILES_KEY, [...allFiles, newFileItem])
        setFiles(prev => [...prev, newFileItem])
        
        // Log audit event
        auditHelpers.logFileUpload(file.name, newFileItem.id, classification)
        
        setToast({ 
          message: `File "${file.name}" uploaded successfully (demo mode)`, 
          type: 'success' 
        })
        return
      }
      
      // Try to get upload URL first (checks if S3 is configured)
      try {
        const uploadUrlResponse = await axios.post(
          `${API_URL}/files/upload-url`,
          {
            fileName: file.name,
            fileType: file.type
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        const { uploadUrl, s3Key, useDirectUpload } = uploadUrlResponse.data

        // If direct upload is required (S3 not configured)
        if (useDirectUpload || !uploadUrl) {
          return await uploadFileDirect(file, token, classification)
        }

        // Step 2: Upload file to S3
        await axios.put(uploadUrl, file, {
          headers: {
            'Content-Type': file.type
          }
        })

        // Step 3: Calculate file hash (simplified - in production use crypto)
        const fileHash = `hash-${Date.now()}-${file.name}`

        // Step 4: Complete upload
        const completeResponse = await axios.post(
          `${API_URL}/files/complete-upload`,
          {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            s3Key: s3Key,
            fileHash: fileHash,
            classification: classification
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        const uploadedFile = completeResponse.data.file
        const newFileItem = mapBackendFileToFileItem(uploadedFile)
        
        // Log audit event
        auditHelpers.logFileUpload(file.name, newFileItem.id, classification)
        
        setFiles(prev => [...prev, newFileItem])
        setToast({ 
          message: `File "${file.name}" uploaded successfully`, 
          type: 'success' 
        })
      } catch (s3Error: any) {
        // If S3 upload fails, fall back to direct upload
        console.log('S3 upload failed, using direct upload:', s3Error.message)
        await uploadFileDirect(file, token, classification)
      }
    } catch (error: any) {
      console.error('Error uploading file:', error)
      // Always show error for upload failures (user action)
      setToast({ 
        message: error.response?.data?.error || 'Failed to upload file', 
        type: 'error' 
      })
    }
  }

  const uploadFileDirect = async (file: globalThis.File, token: string, classification: 'Normal' | 'Confidential' | 'Restricted' = fileClassification) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('classification', classification)

    const response = await axios.post(
      `${API_URL}/files/direct-upload`,
      formData,
      {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    )

    const uploadedFile = response.data.file
    const newFileItem = mapBackendFileToFileItem(uploadedFile)
    
    // Log audit event
    auditHelpers.logFileUpload(file.name, newFileItem.id, classification)
    
    setFiles(prev => [...prev, newFileItem])
    setToast({ 
      message: `File "${file.name}" uploaded successfully`, 
      type: 'success' 
    })
  }

  const handleDownload = async (file: FileItem) => {
    try {
      const fileId = (file as any)._backendId || file.id
      const token = getToken() || 'mock-token-for-testing'
      
      // Skip API call for local files (files with local- prefix)
      if (fileId && fileId.toString().startsWith('local-')) {
        setToast({ message: 'Local files cannot be downloaded from server', type: 'warning' })
        return
      }
      
      // First, try to get the download URL (for S3 files) or file (for local files)
      const response = await axios.get(
        `${API_URL}/files/${fileId}/download-url`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob' // Always get as blob to handle both cases
        }
      )

      // Check content-type to determine if it's JSON or a file
      const contentType = response.headers['content-type'] || ''
      
      if (contentType.includes('application/json')) {
        // Response is JSON with downloadUrl - parse it
        const text = await (response.data as Blob).text()
        const jsonData = JSON.parse(text)
        if (jsonData.downloadUrl) {
          window.open(jsonData.downloadUrl, '_blank')
          setToast({ message: `Downloading "${file.name}"`, type: 'info' })
        } else {
          throw new Error(jsonData.error || 'No download URL available')
        }
      } else {
        // Response is a file blob - trigger download
        const url = window.URL.createObjectURL(response.data)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', file.name)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        setToast({ message: `Downloading "${file.name}"`, type: 'info' })
        
        // Log audit event
        auditHelpers.logFileDownload(file.name, file.id, file.classification)
      }
    } catch (error: any) {
      console.error('Error downloading file:', error)
      
      // Try to parse error message from blob response
      if (error.response && error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text()
          const errorData = JSON.parse(text)
          setToast({ 
            message: errorData.error || 'Failed to download file', 
            type: 'error' 
          })
        } catch {
          setToast({ 
            message: 'Failed to download file', 
            type: 'error' 
          })
        }
      } else {
        setToast({ 
          message: error.response?.data?.error || error.message || 'Failed to download file', 
          type: 'error' 
        })
      }
    }
  }

  const handleViewDetails = (file: FileItem) => {
    setSelectedFile(file)
    setShowDetailsModal(true)
    // Track file opened
    if (user?.id) {
      trackFileOpened(file.id, file.name, user.id)
    }
  }

  const handleRename = async () => {
    if (!selectedFile || !renameValue.trim()) return

    try {
      const fileId = (selectedFile as any)._backendId || selectedFile.id
      const token = getToken() || 'mock-token-for-testing'
      
      // Skip API call for local files (files with local- prefix)
      if (fileId && fileId.toString().startsWith('local-')) {
        // Update locally only
        setFiles(prev => prev.map(f => 
          f.id === selectedFile.id 
            ? { ...f, name: renameValue }
            : f
        ))
        setToast({ message: 'File renamed (local only)', type: 'info' })
        setShowRenameModal(false)
        setSelectedFile(null)
        setRenameValue('')
        return
      }
      
      // Note: Backend doesn't have a rename endpoint, so we'll update locally
      // In a real implementation, you'd add a PATCH endpoint to update file name
      await axios.patch(
        `${API_URL}/files/${fileId}`,
        { name: renameValue },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      ).catch(() => {
        // If endpoint doesn't exist, just update locally
        console.log('Rename endpoint not available, updating locally')
      })

      setFiles(prev => prev.map(f => 
        f.id === selectedFile.id 
          ? { ...f, name: renameValue }
          : f
      ))
      
      // Log audit event
      logAuditEvent('modify', 'file', selectedFile.id, selectedFile.name, true, selectedFile.classification)
      
      setToast({ message: 'File renamed', type: 'success' })
      setShowRenameModal(false)
      setSelectedFile(null)
      setRenameValue('')
    } catch (error: any) {
      // If API fails, still update locally for UI
      setFiles(prev => prev.map(f => 
        f.id === selectedFile.id 
          ? { ...f, name: renameValue }
          : f
      ))
      setToast({ message: 'File renamed (local only)', type: 'info' })
      setShowRenameModal(false)
      setSelectedFile(null)
      setRenameValue('')
    }
  }

  const handleSetLabel = () => {
    if (!selectedFile) return

    setFiles(prev => prev.map(f => 
      f.id === selectedFile.id 
        ? { ...f, adminLabel: labelValue || undefined }
        : f
    ))
    setToast({ message: 'Label updated', type: 'success' })
    setShowLabelModal(false)
    setSelectedFile(null)
    setLabelValue('')
  }

  const handleSetInstruction = () => {
    if (!selectedFile) return

    setFiles(prev => prev.map(f => 
      f.id === selectedFile.id 
        ? { ...f, instructionNote: instructionValue || undefined }
        : f
    ))
    setToast({ message: 'Instruction note added', type: 'success' })
    setShowInstructionModal(false)
    setSelectedFile(null)
    setInstructionValue('')
  }

  const getFileIcon = (file: FileItem) => {
    if (file.isFolder) return FaFolder
    
    const type = file.type.toLowerCase()
    if (type.includes('pdf')) return FaFilePdf
    if (type.includes('word') || type.includes('document')) return FaFileWord
    if (type.includes('excel') || type.includes('spreadsheet')) return FaFileExcel
    if (type.includes('image')) return FaFileImage
    if (type.includes('video')) return FaFileVideo
    
    return FaFileAlt
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getLabelColor = (label?: string) => {
    switch (label) {
      case 'Important': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      case 'Action': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
      case 'Plan': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
      case 'FYI': return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
      default: return ''
    }
  }

  const getClassificationColor = (level?: 'Normal' | 'Confidential' | 'Restricted') => {
    switch (level) {
      case 'Normal':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
      case 'Confidential':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
      case 'Restricted':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="page-content">
        <div className="page-container">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded-lg w-64"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  const selectedRoom = rooms.find(r => r.id === selectedRoomId)

  return (
    <div className="page-content">
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h1 className="page-title">Files</h1>
            {isAdmin && (
              <div className="flex items-center gap-2">
                {/* Upload File Button */}
                <div className="inline-block">
                  <input {...getInputProps()} ref={fileInputRef} style={{ display: 'none' }} />
                  <button 
                    type="button"
                    className="btn-secondary cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      // Trigger file input click
                      if (fileInputRef.current) {
                        fileInputRef.current.click()
                      }
                    }}
                  >
                    <FaUpload /> Upload File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Room Selector and Classification */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Select Room/Project
          </label>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          >
            <option value="all">All Files</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
          </div>
          {isAdmin && (
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Data Classification Level
              </label>
              <select
                value={fileClassification}
                onChange={(e) => setFileClassification(e.target.value as 'Normal' | 'Confidential' | 'Restricted')}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="Normal">Normal</option>
                <option value="Confidential">Confidential</option>
                <option value="Restricted">Restricted</option>
              </select>
            </div>
          )}
        </div>

        {/* Files List */}
        <div className="card">
          {roomFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FaFile className="text-4xl mx-auto mb-3 opacity-50" />
              <p>No files {selectedRoomId !== 'all' && selectedRoom ? `in ${selectedRoom.name}` : 'available'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {roomFiles.map((file) => {
                const Icon = getFileIcon(file)
                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className="text-blue-600 dark:text-blue-400 flex-shrink-0 text-xl" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {file.name}
                          </h3>
                          {file.classification && (
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getClassificationColor(file.classification)}`}>
                              {file.classification}
                            </span>
                          )}
                          {file.adminLabel && (
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getLabelColor(file.adminLabel)}`}>
                              {file.adminLabel}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-500">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>by {file.owner}</span>
                        </div>
                        {file.instructionNote && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-gray-700 dark:text-gray-300">
                              <strong>Note:</strong> {file.instructionNote}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(file)}
                        className="btn-secondary px-3 py-1.5"
                        title="Download"
                      >
                        <FaDownload />
                      </button>
                      <button
                        onClick={() => handleViewDetails(file)}
                        className="btn-secondary px-3 py-1.5"
                        title="View Details"
                      >
                        <FaFile />
                      </button>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedFile(file)
                              setRenameValue(file.name)
                              setShowRenameModal(true)
                            }}
                            className="btn-secondary px-3 py-1.5"
                            title="Rename"
                          >
                            <FaEdit />
                          </button>
                              <button
                                onClick={() => {
                                  setSelectedFile(file)
                                  setLabelValue(file.adminLabel || '')
                                  setShowLabelModal(true)
                                }}
                                className="btn-secondary px-3 py-1.5"
                                title="Set Label"
                              >
                                <FaTag />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedFile(file)
                                  setInstructionValue(file.instructionNote || '')
                                  setShowInstructionModal(true)
                                }}
                                className="btn-secondary px-3 py-1.5"
                                title="Add Instruction"
                              >
                                <FaStickyNote />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedFile(file)
                                  // Initialize permissions from file data
                                  setFilePermissions({
                                    canView: file.sharedWith || [],
                                    canEdit: (file as any).permissions?.canEdit || [],
                                    canDownload: (file as any).permissions?.canDownload || [],
                                    canDelete: (file as any).permissions?.canDelete || []
                                  })
                                  setShowPermissionModal(true)
                                }}
                                className="btn-secondary px-3 py-1.5"
                                title="Manage Permissions"
                              >
                                <FaLock />
                              </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* File Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false)
            setSelectedFile(null)
          }}
          title="File Details"
        >
          {selectedFile && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedFile.name}
                </h3>
                {selectedFile.adminLabel && (
                  <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full mb-2 ${getLabelColor(selectedFile.adminLabel)}`}>
                    {selectedFile.adminLabel}
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Size:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{formatFileSize(selectedFile.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Type:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{selectedFile.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Uploaded:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">
                    {new Date(selectedFile.uploadedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Owner:</span>
                  <span className="text-gray-900 dark:text-white font-semibold">{selectedFile.owner}</span>
                </div>
                {selectedFile.instructionNote && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Instruction Note:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedFile.instructionNote}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleDownload(selectedFile)}
                  className="btn-primary flex-1"
                >
                  <FaDownload /> Download
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Rename Modal */}
        {isAdmin && (
        <Modal
          isOpen={showRenameModal}
          onClose={() => {
            setShowRenameModal(false)
            setSelectedFile(null)
            setRenameValue('')
          }}
          title="Rename File"
        >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  New Name *
                </label>
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter new file name"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowRenameModal(false)
                    setSelectedFile(null)
                    setRenameValue('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRename}
                  className="btn-primary flex-1"
                >
                  Rename
                </button>
              </div>
            </div>
        </Modal>
        )}

        {/* Label Modal */}
        {isAdmin && (
          <Modal
            isOpen={showLabelModal}
            onClose={() => {
              setShowLabelModal(false)
              setSelectedFile(null)
              setLabelValue('')
            }}
            title="Set Label"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Label
                </label>
                <select
                  value={labelValue}
                  onChange={(e) => setLabelValue(e.target.value as any)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">None</option>
                  <option value="Important">Important</option>
                  <option value="Action">Action</option>
                  <option value="Plan">Plan</option>
                  <option value="FYI">FYI</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowLabelModal(false)
                    setSelectedFile(null)
                    setLabelValue('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetLabel}
                  className="btn-primary flex-1"
                >
                  Set Label
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Instruction Note Modal */}
        {isAdmin && (
          <Modal
            isOpen={showInstructionModal}
            onClose={() => {
              setShowInstructionModal(false)
              setSelectedFile(null)
              setInstructionValue('')
            }}
            title="Add Instruction Note"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Instruction Note
                </label>
                <textarea
                  value={instructionValue}
                  onChange={(e) => setInstructionValue(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  rows={4}
                  placeholder="Enter instruction note for this file..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowInstructionModal(false)
                    setSelectedFile(null)
                    setInstructionValue('')
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetInstruction}
                  className="btn-primary flex-1"
                >
                  Save Note
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Classification Selection Modal */}
        <Modal
          isOpen={showClassificationModal}
          onClose={handleClassificationCancel}
          title="Select Data Classification Level"
        >
          <div className="space-y-4">
            {currentUploadFile && (
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  File: <span className="font-semibold text-gray-900 dark:text-white">{currentUploadFile.name}</span>
                </p>
                {fileUploadQueue.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {fileUploadQueue.length} more file(s) waiting...
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Data Classification Level *
              </label>
              <select
                value={fileClassification}
                onChange={(e) => setFileClassification(e.target.value as 'Normal' | 'Confidential' | 'Restricted')}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="Normal">Normal - Standard business data, accessible to all authorized users</option>
                <option value="Confidential">Confidential - Sensitive data, restricted access, requires admin/security roles</option>
                <option value="Restricted">Restricted - Highly sensitive data, security role only with approval</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Select the appropriate classification level for this file
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleClassificationCancel}
                className="btn-secondary flex-1"
              >
                {fileUploadQueue.length > 0 ? 'Skip' : 'Cancel'}
              </button>
              <button
                onClick={handleClassificationConfirm}
                className="btn-primary flex-1"
              >
                {fileUploadQueue.length > 0 ? 'Upload & Next' : 'Upload'}
              </button>
            </div>
          </div>
        </Modal>


        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}

        {/* Permission Control Modal */}
        {isAdmin && (
          <Modal
            isOpen={showPermissionModal}
            onClose={() => {
              setShowPermissionModal(false)
              setSelectedFile(null)
              setFilePermissions({
                canView: [],
                canEdit: [],
                canDownload: [],
                canDelete: []
              })
            }}
            title="File Permission Control"
            size="lg"
          >
            <div className="space-y-6">
              {selectedFile && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    File: <span className="font-semibold text-gray-900 dark:text-white">{selectedFile.name}</span>
                  </p>
                </div>
              )}

              {/* Can View */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FaUserCheck className="text-blue-600 dark:text-blue-400" />
                  Can View
                </label>
                <div className="space-y-2">
                  {rooms.map(room => (
                    <label key={room.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filePermissions.canView.includes(room.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilePermissions(prev => ({
                              ...prev,
                              canView: [...prev.canView, room.id]
                            }))
                          } else {
                            setFilePermissions(prev => ({
                              ...prev,
                              canView: prev.canView.filter(id => id !== room.id)
                            }))
                          }
                        }}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-900 dark:text-white">{room.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Can Edit */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FaEdit className="text-green-600 dark:text-green-400" />
                  Can Edit
                </label>
                <div className="space-y-2">
                  {rooms.map(room => (
                    <label key={room.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filePermissions.canEdit.includes(room.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilePermissions(prev => ({
                              ...prev,
                              canEdit: [...prev.canEdit, room.id]
                            }))
                          } else {
                            setFilePermissions(prev => ({
                              ...prev,
                              canEdit: prev.canEdit.filter(id => id !== room.id)
                            }))
                          }
                        }}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-900 dark:text-white">{room.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Can Download */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FaDownload className="text-purple-600 dark:text-purple-400" />
                  Can Download
                </label>
                <div className="space-y-2">
                  {rooms.map(room => (
                    <label key={room.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filePermissions.canDownload.includes(room.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilePermissions(prev => ({
                              ...prev,
                              canDownload: [...prev.canDownload, room.id]
                            }))
                          } else {
                            setFilePermissions(prev => ({
                              ...prev,
                              canDownload: prev.canDownload.filter(id => id !== room.id)
                            }))
                          }
                        }}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-900 dark:text-white">{room.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Can Delete */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FaUserTimes className="text-red-600 dark:text-red-400" />
                  Can Delete
                </label>
                <div className="space-y-2">
                  {rooms.map(room => (
                    <label key={room.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filePermissions.canDelete.includes(room.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilePermissions(prev => ({
                              ...prev,
                              canDelete: [...prev.canDelete, room.id]
                            }))
                          } else {
                            setFilePermissions(prev => ({
                              ...prev,
                              canDelete: prev.canDelete.filter(id => id !== room.id)
                            }))
                          }
                        }}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-gray-900 dark:text-white">{room.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPermissionModal(false)
                    setSelectedFile(null)
                    setFilePermissions({
                      canView: [],
                      canEdit: [],
                      canDownload: [],
                      canDelete: []
                    })
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedFile) {
                      // Update file with permissions
                      const updatedFiles = files.map(f => {
                        if (f.id === selectedFile.id) {
                          return {
                            ...f,
                            sharedWith: filePermissions.canView,
                            permissions: {
                              canView: filePermissions.canView,
                              canEdit: filePermissions.canEdit,
                              canDownload: filePermissions.canDownload,
                              canDelete: filePermissions.canDelete
                            }
                          }
                        }
                        return f
                      })
                      setFiles(updatedFiles)
                      setJSON(FILES_KEY, updatedFiles)
                      setToast({ message: 'File permissions updated', type: 'success' })
                      setShowPermissionModal(false)
                      setSelectedFile(null)
                    }
                  }}
                  className="btn-primary flex-1"
                >
                  <FaLock /> Save Permissions
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}

export default FileManager
