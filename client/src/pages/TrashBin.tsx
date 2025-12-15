import { useState, useMemo, useEffect } from 'react'
import { FaTrash, FaUndo, FaFile, FaFolder, FaSearch, FaSortUp, FaSortDown, FaChevronLeft, FaChevronRight } from 'react-icons/fa'
import TableSkeleton from '../components/TableSkeleton'
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
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<'name' | 'type' | 'size' | 'deletedAt' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null)
  const itemsPerPage = 10
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

  // Filter and sort data
  const filteredAndSortedItems = useMemo(() => {
    let filtered = trashItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any
        let bVal: any

        if (sortField === 'deletedAt') {
          aVal = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
          bVal = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
        } else if (sortField === 'size') {
          aVal = a.size || 0
          bVal = b.size || 0
        } else if (sortField === 'type') {
          aVal = a.type
          bVal = b.type
        } else {
          aVal = String(a[sortField]).toLowerCase()
          bVal = String(b[sortField]).toLowerCase()
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [trashItems, searchQuery, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage)
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedItems, currentPage])

  const handleSort = (field: 'name' | 'type' | 'size' | 'deletedAt') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const SortIcon = ({ field }: { field: 'name' | 'type' | 'size' | 'deletedAt' }) => {
    if (sortField !== field) {
      return <FaSortUp className="text-gray-400 opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <FaSortUp className="text-blue-600 dark:text-blue-400" />
    ) : (
      <FaSortDown className="text-blue-600 dark:text-blue-400" />
    )
  }

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
          <div>
            <h1 className="page-title">Trash Bin</h1>
            <p className="page-subtitle">Manage deleted files</p>
          </div>
          {trashItems.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="btn-danger"
            >
              <FaTrash /> Empty Trash
            </button>
          )}
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
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
          <div className="card overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="Search by name..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Table with horizontal scroll on small screens */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Name
                        <SortIcon field="name" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-2">
                        Type
                        <SortIcon field="type" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('size')}
                    >
                      <div className="flex items-center gap-2">
                        Size
                        <SortIcon field="size" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('deletedAt')}
                    >
                      <div className="flex items-center gap-2">
                        Deleted At
                        <SortIcon field="deletedAt" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {item.type === 'folder' ? (
                            <FaFolder className="text-yellow-600 dark:text-yellow-400" />
                          ) : (
                            <FaFile className="text-blue-600 dark:text-blue-400" />
                          )}
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 capitalize">
                        {item.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {item.type === 'folder' ? '-' : formatSize(item.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {item.deletedAt ? formatDate(item.deletedAt) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleRestore(item)}
                            className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                            title="Restore"
                          >
                            <FaUndo className="text-lg" />
                          </button>
                          <button
                            onClick={() => {
                              setItemToDelete(item)
                              setShowDeleteConfirm(true)
                            }}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                            title="Delete Permanently"
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)} of {filteredAndSortedItems.length} items
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <FaChevronLeft className="text-xs" />
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 dark:bg-blue-500 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    Next
                    <FaChevronRight className="text-xs" />
                  </button>
                </div>
              </div>
            )}
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
