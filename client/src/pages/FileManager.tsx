import { useEffect, useState, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
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
  FaStickyNote
} from 'react-icons/fa'
import { Modal, Toast, ConfirmDialog } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { FILES_KEY, TRASH_KEY, ROOMS_KEY } from '../data/keys'
import { FileItem, Room } from '../types/models'
import { useUser } from '../contexts/UserContext'
import { trackFileOpened } from '../utils/recentTracker'

const FileManager = () => {
  const { role, user } = useUser()
  const isAdmin = role === 'admin'
  
  const [files, setFiles] = useState<FileItem[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  
  // Modal states
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showLabelModal, setShowLabelModal] = useState(false)
  const [showInstructionModal, setShowInstructionModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  // Form states
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [labelValue, setLabelValue] = useState<'Important' | 'Action' | 'Plan' | 'FYI' | ''>('')
  const [instructionValue, setInstructionValue] = useState('')

  // Load files and rooms from localStorage
  useEffect(() => {
    const savedFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
    const savedRooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    setFiles(savedFiles.filter(f => !f.isTrashed))
    setRooms(savedRooms)
    setLoading(false)
  }, [])

  // Save files to localStorage whenever files change
  useEffect(() => {
    if (files.length >= 0) {
      setJSON(FILES_KEY, files)
    }
  }, [files])

  // Filter files by selected room
  const roomFiles = useMemo(() => {
    if (selectedRoomId === 'all') {
      return files
    }
    return files.filter(file => file.roomId === selectedRoomId || file.sharedWith?.includes(selectedRoomId))
  }, [files, selectedRoomId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles: globalThis.File[]) => {
      if (!isAdmin) {
        setToast({ message: 'Only admins can upload files', type: 'error' })
        return
      }
      if (!selectedRoomId || selectedRoomId === 'all') {
        setToast({ message: 'Please select a room first', type: 'error' })
        return
      }
      
      for (const file of acceptedFiles) {
        await uploadFile(file)
      }
    },
    disabled: !isAdmin || selectedRoomId === 'all'
  })

  const uploadFile = async (file: globalThis.File) => {
      const fileItem: FileItem = {
        id: uuid(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: nowISO(),
        owner: user?.name || 'Current User',
        ownerId: user?.id,
        roomId: selectedRoomId,
        isTrashed: false,
        isFolder: false,
      }

    setFiles(prev => [...prev, fileItem])
    setToast({ message: `File "${file.name}" uploaded to room`, type: 'success' })
  }

  const handleDownload = (file: FileItem) => {
    setToast({ message: `Downloading "${file.name}" (Demo Mode)`, type: 'info' })
  }

  const handleViewDetails = (file: FileItem) => {
    setSelectedFile(file)
    setShowDetailsModal(true)
    // Track file opened
    if (user?.id) {
      trackFileOpened(file.id, file.name, user.id)
    }
  }

  const handleRename = () => {
    if (!selectedFile || !renameValue.trim()) return

    setFiles(prev => prev.map(f => 
      f.id === selectedFile.id 
        ? { ...f, name: renameValue }
        : f
    ))
    setToast({ message: 'File renamed', type: 'success' })
    setShowRenameModal(false)
    setSelectedFile(null)
    setRenameValue('')
  }

  const handleDelete = () => {
    if (!selectedFile) return

    // Move to trash
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
    setToast({ message: 'File moved to trash', type: 'success' })
    setShowDeleteConfirm(false)
    setSelectedFile(null)
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
            <div>
              <h1 className="page-title">Files</h1>
              <p className="page-subtitle">Securely store, share, and manage your documents</p>
            </div>
            {isAdmin && selectedRoomId !== 'all' && (
              <div {...getRootProps()} className="cursor-pointer">
                <input {...getInputProps()} />
                <button className="btn-primary">
                  <FaUpload /> Upload File
                </button>
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
          {selectedRoomId === 'all' ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FaFile className="text-4xl mx-auto mb-3 opacity-50" />
              <p>Select a room to view files</p>
            </div>
          ) : roomFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FaFile className="text-4xl mx-auto mb-3 opacity-50" />
              <p>No files in {selectedRoom?.name || 'this room'}</p>
              {isAdmin && (
                <div {...getRootProps()} className="mt-4">
                  <input {...getInputProps()} />
                  <button className="btn-primary">
                    Upload First File
                  </button>
                </div>
              )}
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
