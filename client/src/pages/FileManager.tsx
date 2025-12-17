import { useEffect, useState, useMemo, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { 
  FaDownload, 
  FaEdit, 
  FaTrash, 
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
  FaUserEdit,
  FaUser,
  FaTimes,
  FaCheckCircle,
  FaLock,
  FaUnlock,
  FaUsers,
  FaDoorOpen,
  FaChevronRight,
  FaSearch,
  FaRobot,
  FaMagic
} from 'react-icons/fa'
import { Modal, Toast, ConfirmDialog } from '../components/common'
import { getJSON, setJSON, nowISO } from '../data/storage'
import { TRASH_KEY, ROOMS_KEY } from '../data/keys'
import { FileItem, Room } from '../types/models'
import { useUser } from '../contexts/UserContext'
import { trackFileOpened } from '../utils/recentTracker'
import { getToken } from '../utils/auth'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const FileManager = () => {
  const { role, user } = useUser()
  const isAdmin = role === 'admin'
  
  const [files, setFiles] = useState<FileItem[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all')
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string }>>([])
  
  // Check if user is a member of any room (for room-based file control)
  const isRoomMember = useMemo(() => {
    if (!user?.id) return false
    return rooms.some(room => room.memberIds?.includes(user.id) || room.ownerId === user.id)
  }, [rooms, user?.id])
  
  // Check if user can manage a specific file (admin or in editors list)
  const canManageFile = (file: FileItem): boolean => {
    if (isAdmin) return true
    if (!user?.id) return false
    
    // Check if user is in editors list
    if (file.editors && file.editors.length > 0) {
      return file.editors.includes(user.id)
    }
    
    return false
  }
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  
  // Modal states
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [showInstructionModal, setShowInstructionModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  
  // Form states
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [labelValue, setLabelValue] = useState<'Important' | 'Action' | 'Plan' | 'FYI' | ''>('')
  const [instructionValue, setInstructionValue] = useState('')
  
  // Permission states - Room members selection
  const [pendingFile, setPendingFile] = useState<globalThis.File | null>(null)
  const [selectedEditorRooms, setSelectedEditorRooms] = useState<string[]>([]) // Selected rooms to show members
  const [selectedViewerRooms, setSelectedViewerRooms] = useState<string[]>([]) // Selected rooms to show members
  const [selectedEditorMembers, setSelectedEditorMembers] = useState<string[]>([]) // Selected member IDs for editing
  const [selectedViewerMembers, setSelectedViewerMembers] = useState<string[]>([]) // Selected member IDs for viewing
  const [expandedEditorRooms, setExpandedEditorRooms] = useState<Set<string>>(new Set()) // Rooms with expanded member list
  const [expandedViewerRooms, setExpandedViewerRooms] = useState<Set<string>>(new Set()) // Rooms with expanded member list
  const [validating, setValidating] = useState(false)
  
  // AI features state
  const [aiSearchQuery, setAiSearchQuery] = useState('')
  const [isAiSearching, setIsAiSearching] = useState(false)
  const [aiSearchResults, setAiSearchResults] = useState<FileItem[]>([])
  const [autoTagEnabled, setAutoTagEnabled] = useState(true)
  
  // File input refs
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef2 = useRef<HTMLInputElement>(null)

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

    // Extract user-based permissions
    const editors = backendFile.editors || []
    const viewers = backendFile.viewers || []
    const editorIds = editors.map((e: any) => e._id?.toString() || e.toString())
    const viewerIds = viewers.map((v: any) => v._id?.toString() || v.toString())
    const editorNames = editors.map((e: any) => e.name || 'Unknown')
    const viewerNames = viewers.map((v: any) => v.name || 'Unknown')

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
      // User-based permissions
      editors: editorIds,
      viewers: viewerIds,
      editorNames: editorNames,
      viewerNames: viewerNames,
      permissionMode: backendFile.permissionMode || 'owner-only',
    }
  }


  // Fetch users for member selection
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = getToken() || 'mock-token-for-testing'
        const response = await axios.get(`${API_URL}/auth/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.data && Array.isArray(response.data)) {
          setAvailableUsers(response.data.map((u: any) => ({
            id: u._id || u.id,
            name: u.name,
            email: u.email
          })))
        }
      } catch (error) {
        console.log('Could not fetch users from API')
      }
    }
    if (isAdmin || isRoomMember) {
      fetchUsers()
    }
  }, [isAdmin, isRoomMember])

  // Load files from API and rooms from localStorage
  useEffect(() => {
    const fetchFiles = async () => {
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
        const errorMessage = error.response?.data?.error || 
                            error.message || 
                            'Failed to load files. Make sure the server and database are running.'
        setToast({ 
          message: errorMessage, 
          type: 'error' 
        })
        setFiles([])
      } finally {
        setLoading(false)
      }
    }

    const savedRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    setRooms(savedRooms)
    
    fetchFiles()
  }, [])

  // Helper to get user info by ID
  const getUserInfo = (userId: string) => {
    return availableUsers.find(u => u.id === userId) || { id: userId, name: userId, email: '' }
  }

  // Toggle room expansion to show members
  const toggleEditorRoom = (roomId: string) => {
    const newExpanded = new Set(expandedEditorRooms)
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId)
    } else {
      newExpanded.add(roomId)
      // Add room to selected if not already
      if (!selectedEditorRooms.includes(roomId)) {
        setSelectedEditorRooms([...selectedEditorRooms, roomId])
        // Remove from viewers if it's there
        setSelectedViewerRooms(selectedViewerRooms.filter(id => id !== roomId))
        // Remove viewer members from this room
        const room = rooms.find(r => r.id === roomId)
        if (room?.memberIds) {
          setSelectedViewerMembers(selectedViewerMembers.filter(id => !room.memberIds?.includes(id)))
        }
      }
    }
    setExpandedEditorRooms(newExpanded)
  }

  const toggleViewerRoom = (roomId: string) => {
    const newExpanded = new Set(expandedViewerRooms)
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId)
    } else {
      newExpanded.add(roomId)
      // Add room to selected if not already
      if (!selectedViewerRooms.includes(roomId)) {
        setSelectedViewerRooms([...selectedViewerRooms, roomId])
        // Remove from editors if it's there
        setSelectedEditorRooms(selectedEditorRooms.filter(id => id !== roomId))
        // Remove editor members from this room
        const room = rooms.find(r => r.id === roomId)
        if (room?.memberIds) {
          setSelectedEditorMembers(selectedEditorMembers.filter(id => !room.memberIds?.includes(id)))
        }
      }
    }
    setExpandedViewerRooms(newExpanded)
  }

  // Toggle member selection
  const toggleEditorMember = (memberId: string, roomId: string) => {
    if (selectedEditorMembers.includes(memberId)) {
      setSelectedEditorMembers(selectedEditorMembers.filter(id => id !== memberId))
    } else {
      setSelectedEditorMembers([...selectedEditorMembers, memberId])
      // Remove from viewers if it's there
      setSelectedViewerMembers(selectedViewerMembers.filter(id => id !== memberId))
    }
  }

  const toggleViewerMember = (memberId: string, roomId: string) => {
    if (selectedViewerMembers.includes(memberId)) {
      setSelectedViewerMembers(selectedViewerMembers.filter(id => id !== memberId))
    } else {
      setSelectedViewerMembers([...selectedViewerMembers, memberId])
      // Remove from editors if it's there
      setSelectedEditorMembers(selectedEditorMembers.filter(id => id !== memberId))
    }
  }

  // Select all members in a room
  const selectAllEditorMembers = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    if (room?.memberIds) {
      const newMembers = [...new Set([...selectedEditorMembers, ...room.memberIds])]
      setSelectedEditorMembers(newMembers)
      // Remove from viewers
      setSelectedViewerMembers(selectedViewerMembers.filter(id => !room.memberIds?.includes(id)))
    }
  }

  const selectAllViewerMembers = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    if (room?.memberIds) {
      const newMembers = [...new Set([...selectedViewerMembers, ...room.memberIds])]
      setSelectedViewerMembers(newMembers)
      // Remove from editors
      setSelectedEditorMembers(selectedEditorMembers.filter(id => !room.memberIds?.includes(id)))
    }
  }

  // Filter files by selected room (if roomId is set, otherwise show all)
  const roomFiles = useMemo(() => {
    let filtered = files
    
    // Apply AI search results if active
    if (aiSearchQuery.trim() && aiSearchResults.length > 0) {
      filtered = aiSearchResults
    }
    
    // Apply room filter
    if (selectedRoomId !== 'all') {
      const roomFiltered = filtered.filter(file => file.roomId === selectedRoomId || file.sharedWith?.includes(selectedRoomId))
      // If no files match the room filter, show all files (backend files don't have roomId yet)
      filtered = roomFiltered.length > 0 ? roomFiltered : filtered
    }
    
    return filtered
  }, [files, selectedRoomId, aiSearchQuery, aiSearchResults])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles: globalThis.File[]) => {
      // Show permission modal for first file, then upload
      if (acceptedFiles.length > 0) {
        setPendingFile(acceptedFiles[0])
        setShowPermissionsModal(true)
        // If multiple files, queue them (for now, handle one at a time)
      }
    },
    disabled: false
  })

  const handlePermissionConfirm = async () => {
    if (!pendingFile) return
    
    // Use selected member IDs instead of room IDs
    setShowPermissionsModal(false)
    setValidating(true)
    
    try {
      await uploadFile(pendingFile, selectedEditorMembers, selectedViewerMembers)
    } finally {
      setValidating(false)
      setPendingFile(null)
      setSelectedEditorRooms([])
      setSelectedViewerRooms([])
      setSelectedEditorMembers([])
      setSelectedViewerMembers([])
      setExpandedEditorRooms(new Set())
      setExpandedViewerRooms(new Set())
    }
  }

  const handlePermissionCancel = () => {
    setShowPermissionsModal(false)
    setPendingFile(null)
    setSelectedEditorRooms([])
    setSelectedViewerRooms([])
    setSelectedEditorMembers([])
    setSelectedViewerMembers([])
    setExpandedEditorRooms(new Set())
    setExpandedViewerRooms(new Set())
  }

  // AI Auto-tagging function
  const getAITags = async (fileName: string, fileType: string, fileSize: number) => {
    if (!autoTagEnabled) return []
    
    try {
      const token = getToken() || 'mock-token-for-testing'
      const response = await axios.post(
        `${API_URL}/ai/auto-tag`,
        {
          fileName: fileName,
          fileType: fileType,
          content: `File: ${fileName}, Type: ${fileType}, Size: ${fileSize} bytes`
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      return response.data.tags || []
    } catch (error) {
      console.log('AI auto-tagging failed, continuing without tags')
      return []
    }
  }

  const uploadFile = async (file: globalThis.File, editorMemberIds: string[] = [], viewerMemberIds: string[] = []) => {
    try {
      const token = getToken() || 'mock-token-for-testing'
      
      // AI Auto-tagging (if enabled)
      let aiTags: string[] = []
      if (autoTagEnabled) {
        try {
          aiTags = await getAITags(file.name, file.type, file.size)
          if (aiTags.length > 0) {
            setToast({ 
              message: `AI suggested tags: ${aiTags.join(', ')}`, 
              type: 'info' 
            })
          }
        } catch (error) {
          // Continue without tags if AI fails
        }
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
          return await uploadFileDirect(file, token, editorMemberIds, viewerMemberIds, aiTags)
        }

        // Step 2: Upload file to S3
        await axios.put(uploadUrl, file, {
          headers: {
            'Content-Type': file.type
          }
        })

        // Step 3: Calculate file hash (simplified - in production use crypto)
        const fileHash = `hash-${Date.now()}-${file.name}`

        // Step 4: Complete upload with member-based permissions
        const permissionMode = editorMemberIds.length > 0 || viewerMemberIds.length > 0 ? 'editors' : 'owner-only'
        const completeResponse = await axios.post(
          `${API_URL}/files/complete-upload`,
          {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            s3Key: s3Key,
            fileHash: fileHash,
            editors: editorMemberIds, // Send member IDs
            viewers: viewerMemberIds, // Send member IDs
            permissionMode: permissionMode,
            tags: aiTags // Include AI-generated tags
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        const uploadedFile = completeResponse.data.file
        const newFileItem = mapBackendFileToFileItem(uploadedFile)
        
        setFiles(prev => [...prev, newFileItem])
        setToast({ 
          message: `File "${file.name}" uploaded successfully${aiTags.length > 0 ? ` with AI tags: ${aiTags.join(', ')}` : ''}`, 
          type: 'success' 
        })
      } catch (s3Error: any) {
        // If S3 upload fails, fall back to direct upload
        console.log('S3 upload failed, using direct upload:', s3Error.message)
        await uploadFileDirect(file, token, editorMemberIds, viewerMemberIds, aiTags)
      }
    } catch (error: any) {
      console.error('Error uploading file:', error)
      setToast({ 
        message: error.response?.data?.error || 'Failed to upload file', 
        type: 'error' 
      })
    }
  }

  const uploadFileDirect = async (file: globalThis.File, token: string, editorMemberIds: string[] = [], viewerMemberIds: string[] = [], aiTags: string[] = []) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('editors', JSON.stringify(editorMemberIds))
    formData.append('viewers', JSON.stringify(viewerMemberIds))
    const permissionMode = editorMemberIds.length > 0 || viewerMemberIds.length > 0 ? 'editors' : 'owner-only'
    formData.append('permissionMode', permissionMode)
    if (aiTags.length > 0) {
      formData.append('tags', JSON.stringify(aiTags))
    }

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
    
    setFiles(prev => [...prev, newFileItem])
    setToast({ 
      message: `File "${file.name}" uploaded successfully${aiTags.length > 0 ? ` with AI tags: ${aiTags.join(', ')}` : ''}`, 
      type: 'success' 
    })
  }

  // AI-powered file search
  const handleAISearch = async () => {
    if (!aiSearchQuery.trim()) {
      setAiSearchResults([])
      return
    }

    setIsAiSearching(true)
    try {
      const token = getToken() || 'mock-token-for-testing'
      const response = await axios.post(
        `${API_URL}/ai/file-search`,
        {
          query: aiSearchQuery,
          files: files.map(f => ({
            name: f.name,
            type: f.type,
            size: f.size
          }))
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      const relevantFileNames = response.data.files?.map((f: any) => f.name) || []
      const filteredFiles = files.filter(f => relevantFileNames.includes(f.name))
      setAiSearchResults(filteredFiles)
      
      if (filteredFiles.length === 0) {
        setToast({ 
          message: 'No files found matching your search query', 
          type: 'info' 
        })
      }
    } catch (error: any) {
      console.error('AI search error:', error)
      setToast({ 
        message: 'AI search failed. Using regular search instead.', 
        type: 'warning' 
      })
      // Fallback to regular search
      const filtered = files.filter(f => 
        f.name.toLowerCase().includes(aiSearchQuery.toLowerCase())
      )
      setAiSearchResults(filtered)
    } finally {
      setIsAiSearching(false)
    }
  }



  const handleDownload = async (file: FileItem) => {
    try {
      // Check if this is a localStorage-only file (no backend ID)
      if (!(file as any)._backendId) {
        setToast({ 
          message: `File "${file.name}" is stored locally. MongoDB is required to download backend files.`, 
          type: 'info' 
        })
        return
      }

      const fileId = (file as any)._backendId || file.id
      const token = getToken() || 'mock-token-for-testing'
      
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
      }
    } catch (error: any) {
      console.error('Error downloading file:', error)
      
      // Check for MongoDB connection error
      const errorMessage = error.response?.data?.error || error.message || 'Failed to download file'
      if (errorMessage.includes('Database not available') || errorMessage.includes('MongoDB')) {
        setToast({ 
          message: 'MongoDB is not running. Please start MongoDB to access files. Run: brew services start mongodb-community (if installed via Homebrew) or start your MongoDB service.', 
          type: 'error' 
        })
        return
      }
      
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
          message: errorMessage, 
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

  const handleDelete = async () => {
    if (!selectedFile) return

    try {
      const fileId = (selectedFile as any)._backendId || selectedFile.id
      const token = getToken() || 'mock-token-for-testing'
      
      await axios.delete(
        `${API_URL}/files/${fileId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      // Move to trash in localStorage for UI purposes
      const trashItems = getJSON<any[]>(TRASH_KEY, []) || []
      setJSON(TRASH_KEY, [...trashItems, {
        id: selectedFile.id,
        name: selectedFile.name,
        type: selectedFile.isFolder ? 'folder' : 'file',
        size: selectedFile.size,
        deletedAt: nowISO(),
        originalPath: selectedFile.path,
        canRestore: true,
        ownerId: selectedFile.ownerId,
        owner: selectedFile.owner,
      }])

      setFiles(prev => prev.filter(f => f.id !== selectedFile.id))
      setToast({ message: 'File deleted successfully', type: 'success' })
      setShowDeleteConfirm(false)
      setSelectedFile(null)
    } catch (error: any) {
      console.error('Error deleting file:', error)
      setToast({ 
        message: error.response?.data?.error || 'Failed to delete file', 
        type: 'error' 
      })
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
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="page-title">Files</h1>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoTagEnabled}
                  onChange={(e) => setAutoTagEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="flex items-center gap-1">
                  <FaMagic className="text-xs" />
                  Auto-tag
                </span>
              </label>
              <div className="inline-block">
                <input {...getInputProps()} ref={fileInputRef} style={{ display: 'none' }} />
                <button 
                  type="button"
                  className="btn-primary cursor-pointer"
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
          </div>
        </div>

        {/* AI-Powered Search Bar */}
        <div className="mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  value={aiSearchQuery}
                  onChange={(e) => {
                    setAiSearchQuery(e.target.value)
                    if (!e.target.value.trim()) {
                      setAiSearchResults([])
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAISearch()
                    }
                  }}
                  placeholder="Search files with AI... (e.g., 'find budget documents', 'show presentation files')"
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <button
                onClick={handleAISearch}
                disabled={isAiSearching || !aiSearchQuery.trim()}
                className="px-4 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAiSearching ? (
                  <>
                    <FaRobot className="animate-pulse" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <FaRobot />
                    <span>AI Search</span>
                  </>
                )}
              </button>
              {aiSearchQuery && (
                <button
                  onClick={() => {
                    setAiSearchQuery('')
                    setAiSearchResults([])
                  }}
                  className="px-3 py-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  title="Clear search"
                >
                  <FaTimes />
                </button>
              )}
            </div>
            {aiSearchQuery && aiSearchResults.length > 0 && (
              <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                <span>Found {aiSearchResults.length} file{aiSearchResults.length !== 1 ? 's' : ''} matching your query</span>
              </div>
            )}
          </div>
        </div>

        {/* Room Selector */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Select Room/Project
          </label>
          <select
            value={selectedRoomId}
            onChange={(e) => setSelectedRoomId(e.target.value)}
            className="w-full sm:w-auto px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
          >
            <option value="all">All Files</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>

        {/* Files List */}
        <div className="card">
          {roomFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FaFile className="text-4xl mx-auto mb-3 opacity-50" />
              <p>No files {selectedRoomId !== 'all' && selectedRoom ? `in ${selectedRoom.name}` : 'available'}</p>
              <div className="mt-4 inline-block">
                <input {...getInputProps()} ref={fileInputRef2} style={{ display: 'none' }} />
                <button 
                  type="button"
                  className="btn-primary cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // Trigger file input click
                    if (fileInputRef2.current) {
                      fileInputRef2.current.click()
                    }
                  }}
                >
                  Upload First File
                </button>
              </div>
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
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {file.name}
                          </h3>
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
                        {/* Permission indicators */}
                        {((file.editors && file.editors.length > 0) || (file.viewers && file.viewers.length > 0)) ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {file.editors && file.editors.length > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                                <FaUserEdit className="text-xs text-purple-600 dark:text-purple-400" />
                                <span className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
                                  {file.editors.length} member{file.editors.length !== 1 ? 's' : ''} can edit
                                </span>
                              </div>
                            )}
                            {file.viewers && file.viewers.length > 0 && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                                <FaUser className="text-xs text-green-600 dark:text-green-400" />
                                <span className="text-xs text-green-700 dark:text-green-300 font-semibold">
                                  {file.viewers.length} member{file.viewers.length !== 1 ? 's' : ''} can view only
                                </span>
                              </div>
                            )}
                          </div>
                        ) : null}
                        {/* Show if current user can control this file */}
                        {canManageFile(file) && !isAdmin && (
                          <div className="mt-2 flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit">
                            <FaUserEdit className="text-xs text-blue-600 dark:text-blue-400" />
                            <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                              You can control this file
                            </span>
                          </div>
                        )}
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
                      {(isAdmin || canManageFile(file)) && (
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
                          {isAdmin && (
                            <>
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
                            </>
                          )}
                          <button
                            onClick={() => {
                              setSelectedFile(file)
                              setShowDeleteConfirm(true)
                            }}
                            className="btn-danger px-3 py-1.5"
                            title="Delete"
                          >
                            <FaTrash />
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
                {/* Editor Members Information */}
                {selectedFile.editors && selectedFile.editors.length > 0 && (
                  <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center gap-2">
                      <FaUserEdit className="text-sm" />
                      Members who can edit:
                    </p>
                    <div className="space-y-1">
                      {selectedFile.editors.map((memberId: string) => {
                        const memberInfo = getUserInfo(memberId)
                        return (
                          <div key={memberId} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <FaUser className="text-purple-600 dark:text-purple-400" />
                            <span className="font-medium">{memberInfo.name}</span>
                            {memberInfo.email && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({memberInfo.email})
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      These members can edit, rename, and delete this file
                    </p>
                  </div>
                )}
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

        {/* Delete Confirmation */}
        {isAdmin && (
          <ConfirmDialog
            isOpen={showDeleteConfirm}
            onCancel={() => {
              setShowDeleteConfirm(false)
              setSelectedFile(null)
            }}
            onConfirm={handleDelete}
            title="Delete File"
            message={`Are you sure you want to delete "${selectedFile?.name}"? This will move it to trash.`}
            confirmText="Delete"
            cancelText="Cancel"
            confirmVariant="danger"
          />
        )}

        {/* Permissions Modal */}
        <Modal
          isOpen={showPermissionsModal}
          onClose={handlePermissionCancel}
          title="Configure File Access Control"
        >
          {pendingFile && (
            <div className="space-y-6">
              {/* File Info */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <FaFile className="text-blue-600 dark:text-blue-400 text-xl" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{pendingFile.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {formatFileSize(pendingFile.size)} • {pendingFile.type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Editors Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <FaUserEdit className="text-purple-600 dark:text-purple-400" />
                    <span>Select Members Who Can Edit</span>
                  </label>
                  {selectedEditorMembers.length > 0 && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-semibold">
                      {selectedEditorMembers.length} member{selectedEditorMembers.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-3 bg-purple-50/30 dark:bg-purple-900/10">
                  {rooms.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      لا توجد غرف متاحة. قم بإنشاء غرفة أولاً
                    </p>
                  ) : (
                    rooms.map((room) => {
                      const isExpanded = expandedEditorRooms.has(room.id)
                      const roomMembers = room.memberIds || []
                      const selectedInRoom = roomMembers.filter(id => selectedEditorMembers.includes(id))
                      
                      return (
                        <div key={room.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
                          {/* Room Header */}
                          <button
                            onClick={() => toggleEditorRoom(room.id)}
                            className={`w-full p-3 transition-all text-left ${
                              selectedEditorRooms.includes(room.id)
                                ? 'bg-purple-100 dark:bg-purple-900/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`p-2 rounded-lg ${
                                  selectedEditorRooms.includes(room.id)
                                    ? 'bg-purple-200 dark:bg-purple-800'
                                    : 'bg-gray-100 dark:bg-gray-600'
                                }`}>
                                  <FaDoorOpen className={`${
                                    selectedEditorRooms.includes(room.id)
                                      ? 'text-purple-600 dark:text-purple-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold text-sm truncate ${
                                    selectedEditorRooms.includes(room.id)
                                      ? 'text-purple-900 dark:text-purple-100'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {room.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <FaUsers className="text-xs text-gray-500 dark:text-gray-400" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {room.members} member{room.members !== 1 ? 's' : ''}
                                    </span>
                                    {selectedInRoom.length > 0 && (
                                      <>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                                          {selectedInRoom.length} selected
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {selectedInRoom.length > 0 && selectedInRoom.length === roomMembers.length && (
                                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                                    All
                                  </span>
                                )}
                                <FaChevronRight className={`text-xs text-gray-500 dark:text-gray-400 transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`} />
                              </div>
                            </div>
                          </button>
                          
                          {/* Room Members List */}
                          {isExpanded && roomMembers.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-2 space-y-1">
                              <div className="flex items-center justify-between mb-2 px-2">
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                  Room Members:
                                </span>
                                {selectedInRoom.length < roomMembers.length && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      selectAllEditorMembers(room.id)
                                    }}
                                    className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold"
                                  >
                                    Select All
                                  </button>
                                )}
                              </div>
                              {roomMembers.map((memberId) => {
                                const memberInfo = getUserInfo(memberId)
                                const isSelected = selectedEditorMembers.includes(memberId)
                                return (
                                  <button
                                    key={memberId}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleEditorMember(memberId, room.id)
                                    }}
                                    className={`w-full p-2 rounded-lg text-left transition-all flex items-center gap-2 ${
                                      isSelected
                                        ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                      isSelected
                                        ? 'border-purple-600 bg-purple-600 dark:bg-purple-500'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                      {isSelected && (
                                        <FaCheckCircle className="text-white text-xs" />
                                      )}
                                    </div>
                                    <FaUser className="text-xs text-gray-500 dark:text-gray-400" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {memberInfo.name}
                                      </p>
                                      {memberInfo.email && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                          {memberInfo.email}
                                        </p>
                                      )}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <FaLock className="text-xs" />
                  Selected members can edit and download
                </p>
              </div>

              {/* Viewers Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <FaUser className="text-green-600 dark:text-green-400" />
                    <span>Select Members Who Can View Only</span>
                  </label>
                  {selectedViewerMembers.length > 0 && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
                      {selectedViewerMembers.length} member{selectedViewerMembers.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto space-y-2 border-2 border-green-200 dark:border-green-800 rounded-xl p-3 bg-green-50/30 dark:bg-green-900/10">
                  {rooms.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      لا توجد غرف متاحة. قم بإنشاء غرفة أولاً
                    </p>
                  ) : (
                    rooms.filter(room => !selectedEditorRooms.includes(room.id)).map((room) => {
                      const isExpanded = expandedViewerRooms.has(room.id)
                      const roomMembers = room.memberIds || []
                      const selectedInRoom = roomMembers.filter(id => selectedViewerMembers.includes(id))
                      
                      return (
                        <div key={room.id} className="border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
                          {/* Room Header */}
                          <button
                            onClick={() => toggleViewerRoom(room.id)}
                            className={`w-full p-3 transition-all text-left ${
                              selectedViewerRooms.includes(room.id)
                                ? 'bg-green-100 dark:bg-green-900/30'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`p-2 rounded-lg ${
                                  selectedViewerRooms.includes(room.id)
                                    ? 'bg-green-200 dark:bg-green-800'
                                    : 'bg-gray-100 dark:bg-gray-600'
                                }`}>
                                  <FaDoorOpen className={`${
                                    selectedViewerRooms.includes(room.id)
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold text-sm truncate ${
                                    selectedViewerRooms.includes(room.id)
                                      ? 'text-green-900 dark:text-green-100'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {room.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <FaUsers className="text-xs text-gray-500 dark:text-gray-400" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {room.members} member{room.members !== 1 ? 's' : ''}
                                    </span>
                                    {selectedInRoom.length > 0 && (
                                      <>
                                        <span className="text-gray-400">•</span>
                                        <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                                          {selectedInRoom.length} selected
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {selectedInRoom.length > 0 && selectedInRoom.length === roomMembers.length && (
                                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                                    All
                                  </span>
                                )}
                                <FaChevronRight className={`text-xs text-gray-500 dark:text-gray-400 transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`} />
                              </div>
                            </div>
                          </button>
                          
                          {/* Room Members List */}
                          {isExpanded && roomMembers.length > 0 && (
                            <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-2 space-y-1">
                              <div className="flex items-center justify-between mb-2 px-2">
                                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                                  Room Members:
                                </span>
                                {selectedInRoom.length < roomMembers.length && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      selectAllViewerMembers(room.id)
                                    }}
                                    className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold"
                                  >
                                    Select All
                                  </button>
                                )}
                              </div>
                              {roomMembers.map((memberId) => {
                                const memberInfo = getUserInfo(memberId)
                                const isSelected = selectedViewerMembers.includes(memberId)
                                return (
                                  <button
                                    key={memberId}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      toggleViewerMember(memberId, room.id)
                                    }}
                                    className={`w-full p-2 rounded-lg text-left transition-all flex items-center gap-2 ${
                                      isSelected
                                        ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                      isSelected
                                        ? 'border-green-600 bg-green-600 dark:bg-green-500'
                                        : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                      {isSelected && (
                                        <FaCheckCircle className="text-white text-xs" />
                                      )}
                                    </div>
                                    <FaUser className="text-xs text-gray-500 dark:text-gray-400" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {memberInfo.name}
                                      </p>
                                      {memberInfo.email && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                          {memberInfo.email}
                                        </p>
                                      )}
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <FaUnlock className="text-xs" />
                  Selected members can only view and download
                </p>
              </div>

              {/* Summary */}
              {(selectedEditorMembers.length > 0 || selectedViewerMembers.length > 0) && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Access Summary</p>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {selectedEditorMembers.length > 0 && (
                      <p>• {selectedEditorMembers.length} member{selectedEditorMembers.length !== 1 ? 's' : ''} can edit</p>
                    )}
                    {selectedViewerMembers.length > 0 && (
                      <p>• {selectedViewerMembers.length} member{selectedViewerMembers.length !== 1 ? 's' : ''} can view only</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Old Summary (for reference) */}
              {false && (selectedEditorRooms.length > 0 || selectedViewerRooms.length > 0) && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <FaCheckCircle className="text-blue-600 dark:text-blue-400" />
                    Access Summary
                  </p>
                  <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    {selectedEditorRooms.length > 0 && (
                      <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        {selectedEditorRooms.length} room{selectedEditorRooms.length !== 1 ? 's' : ''} with edit access
                        ({selectedEditorRooms.reduce((sum, id) => sum + (rooms.find(r => r.id === id)?.members || 0), 0)} members)
                      </p>
                    )}
                    {selectedViewerRooms.length > 0 && (
                      <p className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        {selectedViewerRooms.length} room{selectedViewerRooms.length !== 1 ? 's' : ''} with view access
                        ({selectedViewerRooms.reduce((sum, id) => sum + (rooms.find(r => r.id === id)?.members || 0), 0)} members)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePermissionCancel}
                  className="btn-secondary flex-1"
                  disabled={validating}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePermissionConfirm}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={validating}
                >
                  {validating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <FaUpload />
                      <span>Upload with Permissions</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  )
}

export default FileManager
