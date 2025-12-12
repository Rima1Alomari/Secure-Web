import { useState } from 'react'
import { FaTrash, FaUndo, FaFile, FaFolder, FaRobot } from 'react-icons/fa'

interface TrashItem {
  id: string
  name: string
  type: 'file' | 'folder'
  deletedAt: Date
  size?: number
}

const TrashBin = () => {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([
    {
      id: '1',
      name: 'Old_Report.pdf',
      type: 'file',
      deletedAt: new Date(Date.now() - 86400000),
      size: 2048000
    },
    {
      id: '2',
      name: 'Archive Folder',
      type: 'folder',
      deletedAt: new Date(Date.now() - 172800000)
    },
    {
      id: '3',
      name: 'Draft_Document.docx',
      type: 'file',
      deletedAt: new Date(Date.now() - 259200000),
      size: 512000
    }
  ])

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleRestore = (id: string) => {
    setTrashItems(trashItems.filter((item) => item.id !== id))
    alert('Item restored')
  }

  const handleDeletePermanently = (id: string) => {
    if (window.confirm('Are you sure you want to delete permanently?')) {
      setTrashItems(trashItems.filter((item) => item.id !== id))
    }
  }

  const handleEmptyTrash = () => {
    if (window.confirm('Are you sure you want to empty the trash?')) {
      setTrashItems([])
    }
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white mb-2">
              Trash Bin
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
              Manage deleted files
            </p>
          </div>
          {trashItems.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"
            >
              <FaTrash className="text-xs" /> Empty Trash
            </button>
          )}
        </div>

        {/* AI File Recovery Prediction */}
        {trashItems.length > 0 && (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FaRobot className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Recovery Prediction</h3>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">High Recovery Probability</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Old_Report.pdf - 95% likely to be restored</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Low Recovery Probability</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Archive Folder - 20% likely (deleted 2 days ago)</p>
              </div>
            </div>
          </div>
        )}

        {trashItems.length === 0 ? (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
              <FaTrash className="text-gray-400 text-3xl" />
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              Trash bin is empty
            </p>
          </div>
        ) : (
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Deleted At
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {trashItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {item.type === 'file' ? (
                          <FaFile className="text-blue-600 dark:text-blue-400" />
                        ) : (
                          <FaFolder className="text-yellow-600 dark:text-yellow-400" />
                        )}
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 capitalize">
                      {item.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {formatSize(item.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {formatDate(item.deletedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleRestore(item.id)}
                          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                          title="Restore"
                        >
                          <FaUndo className="text-lg" />
                        </button>
                        <button
                          onClick={() => handleDeletePermanently(item.id)}
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
        )}
      </div>
    </div>
  )
}

export default TrashBin

