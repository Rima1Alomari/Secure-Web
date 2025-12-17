import { useState, useMemo, useEffect } from 'react'
import { FaTrash, FaUndo, FaFile, FaFolder } from 'react-icons/fa'
import { Toast, ConfirmDialog } from '../components/common'
import { getJSON, setJSON } from '../data/storage'
import { FILES_KEY, TRASH_KEY } from '../data/keys'
import { FileItem, TrashItem } from '../types/models'
import { useUser } from '../contexts/UserContext'

const TrashBin = () => {
  const { role, user } = useUser()
  const isAdmin = role === 'admin'
  
  const [trashItems, setTrashItems] = useState<TrashItem[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  

  // Load trash items from localStorage
  useEffect(() => {
    const savedTrash = getJSON<TrashItem[]>(TRASH_KEY, []) || []
    // Filter by user: admin sees all, user sees only their own
    const filtered = isAdmin 
      ? savedTrash 
      : savedTrash.filter(item => {
          // Check if item belongs to current user
          return item.ownerId === user?.id || item.owner === user?.name
        })
    setTrashItems(filtered)
    setIsLoading(false)
  }, [isAdmin, user?.id, user?.name])

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Sort by deleted date (most recent first)
  const filteredAndSortedItems = useMemo(() => {
    return [...trashItems].sort((a, b) => {
      const aTime = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
      const bTime = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
      return bTime - aTime
    })
  }, [trashItems])

  const handleRestore = (item: TrashItem) => {
    // Remove from trash
    const allTrash = getJSON<TrashItem[]>(TRASH_KEY, []) || []
    setJSON(TRASH_KEY, allTrash.filter(i => i.id !== item.id))
    setTrashItems(prev => prev.filter(i => i.id !== item.id))
    
    // Add back to files (remove isTrashed flag)
    const files = getJSON<FileItem[]>(FILES_KEY, []) || []
    const restoredItem: FileItem = {
      id: item.id,
      name: item.name,
      size: item.size,
      type: item.type === 'folder' ? 'folder' : 'application/octet-stream',
      uploadedAt: item.deletedAt || new Date().toISOString(),
      owner: 'Current User',
      isTrashed: false,
      isFolder: item.type === 'folder',
    }
    setJSON(FILES_KEY, [...files.filter(f => f.id !== item.id), restoredItem])
    
    setToast({ message: `"${item.name}" restored successfully`, type: 'success' })
  }

  const handleDeletePermanently = () => {
    if (!itemToDelete) return

    // Remove from trash
    const allTrash = getJSON<TrashItem[]>(TRASH_KEY, []) || []
    setJSON(TRASH_KEY, allTrash.filter(i => i.id !== itemToDelete.id))
    setTrashItems(prev => prev.filter(i => i.id !== itemToDelete.id))
    
    // Remove from files if it exists
    const files = getJSON<FileItem[]>(FILES_KEY, []) || []
    setJSON(FILES_KEY, files.filter(f => f.id !== itemToDelete.id))
    
    setToast({ message: `"${itemToDelete.name}" permanently deleted`, type: 'info' })
    setShowDeleteConfirm(false)
    setItemToDelete(null)
  }

  const handleEmptyTrash = () => {
    if (window.confirm('Are you sure you want to empty the trash? All items will be permanently deleted.')) {
      setJSON(TRASH_KEY, [])
      setTrashItems([])
      setToast({ message: 'Trash emptied', type: 'info' })
    }
  }


  return (
    <div className="page-content">
      <div className="page-container">
        <div className="flex justify-between items-center page-header">
          <h1 className="page-title">Trash</h1>
          <div className="flex items-center gap-2">
            {trashItems.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="btn-danger"
              >
                <FaTrash /> Empty Trash
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="card">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl animate-pulse">
                  <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        ) : trashItems.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full mb-6">
              <FaTrash className="text-gray-400 dark:text-gray-500 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Trash is empty
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Deleted files will appear here. You can restore them or delete them permanently.
            </p>
          </div>
        ) : (
          <div className="card">
            <div className="space-y-3">
              {filteredAndSortedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {item.type === 'folder' ? (
                      <FaFolder className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 text-xl" />
                    ) : (
                      <FaFile className="text-blue-600 dark:text-blue-400 flex-shrink-0 text-xl" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-500 mt-1">
                        <span className="capitalize">{item.type}</span>
                        {item.size && (
                          <>
                            <span>•</span>
                            <span>{formatSize(item.size)}</span>
                          </>
                        )}
                        {item.deletedAt && (
                          <>
                            <span>•</span>
                            <span>{formatDate(item.deletedAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleRestore(item)}
                      className="btn-secondary px-3 py-1.5"
                      title="Restore"
                    >
                      <FaUndo /> Restore
                    </button>
                    <button
                      onClick={() => {
                        setItemToDelete(item)
                        setShowDeleteConfirm(true)
                      }}
                      className="btn-danger px-3 py-1.5"
                      title="Delete Permanently"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Permanently Confirmation */}
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setItemToDelete(null)
          }}
          onConfirm={handleDeletePermanently}
          title="Delete Permanently"
          message={`Are you sure you want to permanently delete "${itemToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete Permanently"
          cancelText="Cancel"
          confirmVariant="danger"
        />

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

export default TrashBin
