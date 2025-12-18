import { useState, useEffect, useMemo } from 'react'
import { 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaClock,
  FaUserShield,
  FaSearch,
  FaFilter,
  FaPlus,
  FaEdit,
  FaTrash,
  FaUsers,
  FaFileAlt,
  FaLock,
  FaUnlock
} from 'react-icons/fa'
import { Modal, ConfirmDialog, Toast } from './common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { useUser } from '../contexts/UserContext'

interface SecurityIncident {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed'
  assignedTo: string[]
  reportedBy: string
  reportedAt: string
  updatedAt: string
  affectedResources: string[]
  tags: string[]
  notes: Array<{ id: string; author: string; content: string; timestamp: string }>
  relatedFiles: string[]
  relatedRooms: string[]
}

const SECURITY_INCIDENTS_KEY = 'security-incidents'

export default function SecurityIncidentManagement() {
  const { user, role } = useUser()
  const [incidents, setIncidents] = useState<SecurityIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSeverity, setFormSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium')
  const [formStatus, setFormStatus] = useState<'open' | 'investigating' | 'contained' | 'resolved' | 'closed'>('open')
  const [formTags, setFormTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [newNote, setNewNote] = useState('')

  useEffect(() => {
    loadIncidents()
  }, [])

  const loadIncidents = () => {
    const stored = getJSON<SecurityIncident[]>(SECURITY_INCIDENTS_KEY, [])
    setIncidents(stored)
    setLoading(false)
  }

  const saveIncidents = (newIncidents: SecurityIncident[]) => {
    setJSON(SECURITY_INCIDENTS_KEY, newIncidents)
    setIncidents(newIncidents)
  }

  const filteredIncidents = useMemo(() => {
    let filtered = incidents

    if (filterStatus !== 'all') {
      filtered = filtered.filter(i => i.status === filterStatus)
    }

    if (filterSeverity !== 'all') {
      filtered = filtered.filter(i => i.severity === filterSeverity)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(query) ||
        i.description.toLowerCase().includes(query) ||
        i.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return filtered.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }, [incidents, filterStatus, filterSeverity, searchQuery])

  const handleCreateIncident = () => {
    if (!formTitle.trim()) {
      setToast({ message: 'Please enter a title', type: 'error' })
      return
    }

    const newIncident: SecurityIncident = {
      id: uuid(),
      title: formTitle,
      description: formDescription,
      severity: formSeverity,
      status: 'open',
      assignedTo: [],
      reportedBy: user?.name || 'Unknown',
      reportedAt: nowISO(),
      updatedAt: nowISO(),
      affectedResources: [],
      tags: formTags,
      notes: [],
      relatedFiles: [],
      relatedRooms: []
    }

    saveIncidents([...incidents, newIncident])
    setShowCreateModal(false)
    resetForm()
    setToast({ message: 'Security incident created successfully', type: 'success' })
  }

  const handleUpdateIncident = () => {
    if (!selectedIncident || !formTitle.trim()) {
      return
    }

    const updated = incidents.map(incident =>
      incident.id === selectedIncident.id
        ? {
            ...incident,
            title: formTitle,
            description: formDescription,
            severity: formSeverity,
            status: formStatus,
            tags: formTags,
            updatedAt: nowISO()
          }
        : incident
    )

    saveIncidents(updated)
    setShowEditModal(false)
    setSelectedIncident(null)
    resetForm()
    setToast({ message: 'Incident updated successfully', type: 'success' })
  }

  const handleDeleteIncident = (incident: SecurityIncident) => {
    const updated = incidents.filter(i => i.id !== incident.id)
    saveIncidents(updated)
    setShowDeleteConfirm(false)
    setSelectedIncident(null)
    setToast({ message: 'Incident deleted successfully', type: 'success' })
  }

  const handleAddNote = () => {
    if (!selectedIncident || !newNote.trim()) {
      return
    }

    const note = {
      id: uuid(),
      author: user?.name || 'Unknown',
      content: newNote,
      timestamp: nowISO()
    }

    const updated = incidents.map(incident =>
      incident.id === selectedIncident.id
        ? {
            ...incident,
            notes: [...incident.notes, note],
            updatedAt: nowISO()
          }
        : incident
    )

    saveIncidents(updated)
    setNewNote('')
    loadIncidents()
    setSelectedIncident(updated.find(i => i.id === selectedIncident.id) || null)
  }

  const handleStatusChange = (incident: SecurityIncident, newStatus: SecurityIncident['status']) => {
    const updated = incidents.map(i =>
      i.id === incident.id
        ? { ...i, status: newStatus, updatedAt: nowISO() }
        : i
    )
    saveIncidents(updated)
    setToast({ message: `Incident status changed to ${newStatus}`, type: 'success' })
  }

  const resetForm = () => {
    setFormTitle('')
    setFormDescription('')
    setFormSeverity('medium')
    setFormStatus('open')
    setFormTags([])
    setNewTag('')
    setNewNote('')
  }

  const openEditModal = (incident: SecurityIncident) => {
    setSelectedIncident(incident)
    setFormTitle(incident.title)
    setFormDescription(incident.description)
    setFormSeverity(incident.severity)
    setFormStatus(incident.status)
    setFormTags(incident.tags)
    setShowEditModal(true)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-700 text-white'
      case 'high': return 'bg-red-600 text-white'
      case 'medium': return 'bg-yellow-600 text-white'
      case 'low': return 'bg-blue-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': case 'closed': return 'bg-green-600 text-white'
      case 'contained': return 'bg-blue-600 text-white'
      case 'investigating': return 'bg-yellow-600 text-white'
      case 'open': return 'bg-red-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading incidents...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Security Incident Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track, investigate, and resolve security incidents collaboratively
          </p>
        </div>
        {(role === 'admin' || role === 'security') && (
          <button
            onClick={() => {
              resetForm()
              setShowCreateModal(true)
            }}
            className="btn-primary"
          >
            <FaPlus /> New Incident
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="contained">Contained</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <div className="card text-center py-12">
            <FaShieldAlt className="text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No incidents found</p>
          </div>
        ) : (
          filteredIncidents.map(incident => (
            <div key={incident.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                      {incident.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(incident.severity)}`}>
                      {incident.severity.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(incident.status)}`}>
                      {incident.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    {incident.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Reported by: {incident.reportedBy}</span>
                    <span>•</span>
                    <span>{new Date(incident.reportedAt).toLocaleDateString()}</span>
                    {incident.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex gap-1">
                          {incident.tags.map(tag => (
                            <span key={tag} className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    {incident.notes.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{incident.notes.length} note(s)</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(role === 'admin' || role === 'security') && (
                    <>
                      <button
                        onClick={() => openEditModal(incident)}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedIncident(incident)
                          setShowDeleteConfirm(true)
                        }}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setSelectedIncident(incident)
                      setShowEditModal(true)
                    }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-md text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowCreateModal(false)
            setShowEditModal(false)
            setSelectedIncident(null)
            resetForm()
          }}
          title={showCreateModal ? 'Create Security Incident' : 'Edit Security Incident'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Brief incident description"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Detailed incident description..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Severity
                </label>
                <select
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              {showEditModal && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="contained">Contained</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newTag.trim()) {
                      setFormTags([...formTags, newTag.trim()])
                      setNewTag('')
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Add tag (press Enter)"
                />
              </div>
              {formTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button
                        onClick={() => setFormTags(formTags.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-slate-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  setSelectedIncident(null)
                  resetForm()
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={showCreateModal ? handleCreateIncident : handleUpdateIncident}
                className="btn-primary"
              >
                {showCreateModal ? 'Create' : 'Update'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Incident Details Modal */}
      {selectedIncident && showEditModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowEditModal(false)
            setSelectedIncident(null)
            resetForm()
          }}
          title={selectedIncident.title}
        >
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 text-sm font-semibold rounded ${getSeverityColor(selectedIncident.severity)}`}>
                  {selectedIncident.severity.toUpperCase()}
                </span>
                <span className={`px-3 py-1 text-sm font-semibold rounded ${getStatusColor(selectedIncident.status)}`}>
                  {selectedIncident.status.toUpperCase()}
                </span>
                {(role === 'admin' || role === 'security') && (
                  <select
                    value={selectedIncident.status}
                    onChange={(e) => handleStatusChange(selectedIncident, e.target.value as any)}
                    className="ml-auto px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="open">Open</option>
                    <option value="investigating">Investigating</option>
                    <option value="contained">Contained</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                )}
              </div>
              <p className="text-gray-700 dark:text-gray-300">{selectedIncident.description}</p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Notes & Updates</h4>
              <div className="space-y-3 mb-4">
                {selectedIncident.notes.map(note => (
                  <div key={note.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{note.author}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(note.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{note.content}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && newNote.trim()) {
                      handleAddNote()
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Add a note or update..."
                />
                <button onClick={handleAddNote} className="btn-primary">
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && selectedIncident && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => {
            setShowDeleteConfirm(false)
            setSelectedIncident(null)
          }}
          onConfirm={() => handleDeleteIncident(selectedIncident)}
          title="Delete Incident"
          message={`Are you sure you want to delete "${selectedIncident.title}"? This action cannot be undone.`}
        />
      )}
    </div>
  )
}

