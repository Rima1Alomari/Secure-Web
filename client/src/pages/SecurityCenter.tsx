import { useState, useEffect, useMemo } from 'react'
import { 
  FiShield, 
  FiLock, 
  FiFile,
  FiUsers,
  FiCalendar,
  FiSettings,
  FiSearch,
  FiFilter,
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
  FiEdit,
  FiTrash,
  FiPlus,
  FiCheck,
  FiX,
  FiAlertTriangle,
  FiActivity,
  FiKey,
  FiCheckCircle
} from 'react-icons/fi'
import { Toast, Modal, ConfirmDialog } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { AUDIT_LOGS_KEY, ACCESS_RULES_KEY } from '../data/keys'
import { AuditLog, AccessRule } from '../types/models'
import { useUser } from '../contexts/UserContext'
import AISecurityDashboard from '../components/AISecurityDashboard'
import SecurityIncidentManagement from '../components/SecurityIncidentManagement'

type Classification = 'Normal' | 'Confidential' | 'Restricted'
type Tab = 'classification' | 'access-rules' | 'audit-log' | 'ai-security' | 'incidents'

export default function SecurityCenter() {
  const { role } = useUser()
  const [activeTab, setActiveTab] = useState<Tab>('classification')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  
  // Classification state
  const [classificationLevel, setClassificationLevel] = useState<Classification>('Normal')
  
  // Access Rules state
  const [accessRules, setAccessRules] = useState<AccessRule[]>([])
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AccessRule | null>(null)
  const [showDeleteRuleConfirm, setShowDeleteRuleConfirm] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<AccessRule | null>(null)
  
  // Rule form state
  const [ruleName, setRuleName] = useState('')
  const [ruleDescription, setRuleDescription] = useState('')
  const [ruleClassification, setRuleClassification] = useState<Classification>('Normal')
  const [ruleAllowedRoles, setRuleAllowedRoles] = useState<('user' | 'admin' | 'security')[]>([])
  const [ruleRequiresMFA, setRuleRequiresMFA] = useState(false)
  const [ruleRequiresApproval, setRuleRequiresApproval] = useState(false)
  const [ruleEnabled, setRuleEnabled] = useState(true)
  
  // Audit Log state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditSearchQuery, setAuditSearchQuery] = useState('')
  const [auditFilterAction, setAuditFilterAction] = useState<string>('all')
  const [auditFilterClassification, setAuditFilterClassification] = useState<string>('all')
  const [auditCurrentPage, setAuditCurrentPage] = useState(1)
  const auditItemsPerPage = 20
  
  // AI Anomaly Detection state
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [anomalyLoading, setAnomalyLoading] = useState(false)
  const [encryptionStatus, setEncryptionStatus] = useState<{
    endToEnd: 'Active' | 'Inactive'
    fileEncryption: 'Active' | 'Inactive'
    messageEncryption: 'Active' | 'Inactive'
    keyManagement: 'Active' | 'Inactive'
  }>({
    endToEnd: 'Active',
    fileEncryption: 'Active',
    messageEncryption: 'Active',
    keyManagement: 'Active'
  })

  // Load AI anomaly detection
  useEffect(() => {
    const detectAnomalies = async () => {
      setAnomalyLoading(true)
      try {
        const API_URL = (import.meta as any).env.VITE_API_URL || '/api'
        const response = await fetch(`${API_URL}/ai/anomaly-analysis`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || 'mock-token-for-testing'}`
          },
          body: JSON.stringify({
            auditLogs: auditLogs.slice(0, 100), // Last 100 logs
            timeRange: '24h'
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          setAnomalies(data.anomalies || [])
        }
      } catch (error) {
        console.error('Anomaly detection error:', error)
        // Mock anomalies for demo
        setAnomalies([
          {
            id: '1',
            type: 'suspicious_access',
            severity: 'high',
            description: 'Multiple failed access attempts detected',
            timestamp: new Date().toISOString(),
            recommendation: 'Review access logs and consider IP blocking'
          }
        ])
      } finally {
        setAnomalyLoading(false)
      }
    }
    
    if (auditLogs.length > 0) {
      detectAnomalies()
    }
  }, [auditLogs])

  // Load encryption status
  useEffect(() => {
    // Check encryption status from system
    const checkEncryptionStatus = () => {
      // In a real app, this would check actual encryption status
      setEncryptionStatus({
        endToEnd: 'Active',
        fileEncryption: 'Active',
        messageEncryption: 'Active',
        keyManagement: 'Active'
      })
    }
    checkEncryptionStatus()
  }, [])

  // Load data from localStorage
  useEffect(() => {
    const savedRules = getJSON<AccessRule[]>(ACCESS_RULES_KEY, []) || []
    const savedAuditLogs = getJSON<AuditLog[]>(AUDIT_LOGS_KEY, []) || []
    
    // Initialize with default rules if empty
    if (savedRules.length === 0) {
      const defaultRules: AccessRule[] = [
        {
          id: uuid(),
          name: 'Normal Classification Access',
          description: 'Standard access for Normal classification files',
          classification: 'Normal',
          allowedRoles: ['user', 'admin', 'security'],
          requiresMFA: false,
          requiresApproval: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
          enabled: true,
        },
        {
          id: uuid(),
          name: 'Confidential Classification Access',
          description: 'Restricted access for Confidential files - Admin and Security only',
          classification: 'Confidential',
          allowedRoles: ['admin', 'security'],
          requiresMFA: true,
          requiresApproval: false,
          createdAt: nowISO(),
          updatedAt: nowISO(),
          enabled: true,
        },
        {
          id: uuid(),
          name: 'Restricted Classification Access',
          description: 'Highly restricted access for Restricted files - Security only with approval',
          classification: 'Restricted',
          allowedRoles: ['security'],
          requiresMFA: true,
          requiresApproval: true,
          createdAt: nowISO(),
          updatedAt: nowISO(),
          enabled: true,
        },
      ]
      setAccessRules(defaultRules)
      setJSON(ACCESS_RULES_KEY, defaultRules)
    } else {
      setAccessRules(savedRules)
    }
    
    setAuditLogs(savedAuditLogs)
    setLoading(false)
  }, [])

  // Save access rules to localStorage
  useEffect(() => {
    if (accessRules.length >= 0) {
      setJSON(ACCESS_RULES_KEY, accessRules)
    }
  }, [accessRules])

  // Save audit logs to localStorage
  useEffect(() => {
    if (auditLogs.length >= 0) {
      setJSON(AUDIT_LOGS_KEY, auditLogs)
    }
  }, [auditLogs])

  // Filtered and paginated audit logs
  const filteredAuditLogs = useMemo(() => {
    let filtered = auditLogs

    // Search filter
    if (auditSearchQuery.trim()) {
      const query = auditSearchQuery.toLowerCase()
      filtered = filtered.filter(log =>
        log.userName.toLowerCase().includes(query) ||
        log.resourceName.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query)
      )
    }

    // Action filter
    if (auditFilterAction !== 'all') {
      filtered = filtered.filter(log => log.action === auditFilterAction)
    }

    // Classification filter
    if (auditFilterClassification !== 'all') {
      filtered = filtered.filter(log => log.classification === auditFilterClassification)
    }

    // Sort by timestamp (newest first)
    filtered = [...filtered].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    return filtered
  }, [auditLogs, auditSearchQuery, auditFilterAction, auditFilterClassification])

  const auditTotalPages = Math.ceil(filteredAuditLogs.length / auditItemsPerPage)
  const paginatedAuditLogs = useMemo(() => {
    const startIndex = (auditCurrentPage - 1) * auditItemsPerPage
    return filteredAuditLogs.slice(startIndex, startIndex + auditItemsPerPage)
  }, [filteredAuditLogs, auditCurrentPage])

  const handleCreateRule = () => {
    setEditingRule(null)
    setRuleName('')
    setRuleDescription('')
    setRuleClassification('Normal')
    setRuleAllowedRoles([])
    setRuleRequiresMFA(false)
    setRuleRequiresApproval(false)
    setRuleEnabled(true)
    setShowRuleModal(true)
  }

  const handleEditRule = (rule: AccessRule) => {
    setEditingRule(rule)
    setRuleName(rule.name)
    setRuleDescription(rule.description)
    setRuleClassification(rule.classification)
    setRuleAllowedRoles([...rule.allowedRoles])
    setRuleRequiresMFA(rule.requiresMFA)
    setRuleRequiresApproval(rule.requiresApproval)
    setRuleEnabled(rule.enabled)
    setShowRuleModal(true)
  }

  const handleSaveRule = () => {
    if (!ruleName.trim()) {
      setToast({ message: 'Rule name is required', type: 'error' })
      return
    }

    if (ruleAllowedRoles.length === 0) {
      setToast({ message: 'At least one role must be selected', type: 'error' })
      return
    }

    if (editingRule) {
      // Update existing rule
      setAccessRules(prev => prev.map(rule =>
        rule.id === editingRule.id
          ? {
              ...rule,
              name: ruleName,
              description: ruleDescription,
              classification: ruleClassification,
              allowedRoles: ruleAllowedRoles,
              requiresMFA: ruleRequiresMFA,
              requiresApproval: ruleRequiresApproval,
              enabled: ruleEnabled,
              updatedAt: nowISO(),
            }
          : rule
      ))
      setToast({ message: 'Access rule updated', type: 'success' })
    } else {
      // Create new rule
      const newRule: AccessRule = {
        id: uuid(),
        name: ruleName,
        description: ruleDescription,
        classification: ruleClassification,
        allowedRoles: ruleAllowedRoles,
        requiresMFA: ruleRequiresMFA,
        requiresApproval: ruleRequiresApproval,
        enabled: ruleEnabled,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      }
      setAccessRules(prev => [...prev, newRule])
      setToast({ message: 'Access rule created', type: 'success' })
    }

    setShowRuleModal(false)
    resetRuleForm()
  }


  const resetRuleForm = () => {
    setEditingRule(null)
    setRuleName('')
    setRuleDescription('')
    setRuleClassification('Normal')
    setRuleAllowedRoles([])
    setRuleRequiresMFA(false)
    setRuleRequiresApproval(false)
    setRuleEnabled(true)
  }

  const handleDeleteRule = () => {
    if (!ruleToDelete) return

    setAccessRules(prev => prev.filter(rule => rule.id !== ruleToDelete.id))
    setToast({ message: 'Access rule deleted', type: 'success' })
    setShowDeleteRuleConfirm(false)
    setRuleToDelete(null)
  }

  const toggleRole = (role: 'user' | 'admin' | 'security') => {
    if (ruleAllowedRoles.includes(role)) {
      setRuleAllowedRoles(prev => prev.filter(r => r !== role))
    } else {
      setRuleAllowedRoles(prev => [...prev, role])
    }
  }

  const getClassificationColor = (level: Classification) => {
    switch (level) {
      case 'Normal':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
      case 'Confidential':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
      case 'Restricted':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
    }
  }

  const getActionIcon = (action: AuditLog['action']) => {
    switch (action) {
      case 'access':
      case 'view':
        return <FiFile className="text-blue-600 dark:text-blue-400" />
      case 'download':
        return <FiDownload className="text-green-600 dark:text-green-400" />
      case 'upload':
        return <FiFile className="text-purple-600 dark:text-purple-400" />
      case 'delete':
        return <FiTrash className="text-red-600 dark:text-red-400" />
      case 'modify':
        return <FiEdit className="text-orange-600 dark:text-orange-400" />
      case 'share':
        return <FiUsers className="text-indigo-600 dark:text-indigo-400" />
      default:
        return <FiFile />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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

  return (
    <div className="page-content">
      <div className="page-container">
        {/* Page Header */}
        <div className="page-header">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="page-title">Security</h1>
          </div>
        </div>

        {/* Encryption Status Overview */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiKey className="text-blue-600 dark:text-blue-400" />
            Encryption Status Overview
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">End-to-End</span>
                {encryptionStatus.endToEnd === 'Active' ? (
                  <FiCheckCircle className="text-green-600 dark:text-green-400" />
                ) : (
                  <FiX className="text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className={`text-lg font-bold ${
                encryptionStatus.endToEnd === 'Active' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {encryptionStatus.endToEnd}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">File Encryption</span>
                {encryptionStatus.fileEncryption === 'Active' ? (
                  <FiCheckCircle className="text-green-600 dark:text-green-400" />
                ) : (
                  <FiX className="text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className={`text-lg font-bold ${
                encryptionStatus.fileEncryption === 'Active' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {encryptionStatus.fileEncryption}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Message Encryption</span>
                {encryptionStatus.messageEncryption === 'Active' ? (
                  <FiCheckCircle className="text-green-600 dark:text-green-400" />
                ) : (
                  <FiX className="text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className={`text-lg font-bold ${
                encryptionStatus.messageEncryption === 'Active' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {encryptionStatus.messageEncryption}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-gray-200 dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Key Management</span>
                {encryptionStatus.keyManagement === 'Active' ? (
                  <FiCheckCircle className="text-green-600 dark:text-green-400" />
                ) : (
                  <FiX className="text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className={`text-lg font-bold ${
                encryptionStatus.keyManagement === 'Active' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {encryptionStatus.keyManagement}
              </div>
            </div>
          </div>
        </div>

        {/* AI-Based Anomaly Detection */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FiActivity className="text-blue-600 dark:text-blue-400" />
              AI-Based Anomaly Detection
            </h2>
            <button
              onClick={() => {
                setAnomalyLoading(true)
                // Trigger anomaly detection
                setTimeout(() => setAnomalyLoading(false), 1000)
              }}
              className="btn-secondary text-sm"
            >
              <FiSearch /> Refresh
            </button>
          </div>
          
          {anomalyLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Analyzing system for anomalies...</p>
            </div>
          ) : anomalies.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FiCheckCircle className="text-4xl mx-auto mb-3 opacity-50 text-green-500" />
              <p>No anomalies detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`p-4 rounded-lg border-2 ${
                    anomaly.severity === 'critical' || anomaly.severity === 'high'
                      ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                      : 'border-yellow-500 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FiAlertTriangle className={`text-lg ${
                          anomaly.severity === 'critical' || anomaly.severity === 'high'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`} />
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          anomaly.severity === 'critical' || anomaly.severity === 'high'
                            ? 'bg-red-600 text-white'
                            : 'bg-yellow-600 text-white'
                        }`}>
                          {anomaly.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {anomaly.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white mb-2">
                        {anomaly.description}
                      </p>
                      {anomaly.recommendation && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <strong>Recommendation:</strong> {anomaly.recommendation}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {new Date(anomaly.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b-2 border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('classification')}
              className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
                activeTab === 'classification'
                  ? 'border-slate-600 dark:border-slate-400 text-slate-600 dark:text-slate-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Classification Levels
            </button>
            <button
              onClick={() => setActiveTab('access-rules')}
              className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
                activeTab === 'access-rules'
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Access Rules
            </button>
            <button
              onClick={() => setActiveTab('audit-log')}
              className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
                activeTab === 'audit-log'
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Audit Log
            </button>
            <button
              onClick={() => setActiveTab('ai-security')}
              className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
                activeTab === 'ai-security'
                  ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              AI Security Dashboard
            </button>
            {(role === 'admin' || role === 'security') && (
              <button
                onClick={() => setActiveTab('incidents')}
                className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
                  activeTab === 'incidents'
                    ? 'border-slate-600 dark:border-slate-400 text-slate-600 dark:text-slate-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                Incident Management
              </button>
            )}
          </div>
        </div>

        {/* Classification Levels Tab */}
        {activeTab === 'classification' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Data Classification Levels
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Define and manage classification levels for your data. Each level has different access requirements.
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Normal */}
                <div className={`p-6 rounded-xl border-2 ${getClassificationColor('Normal')}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <FiShield className="text-2xl" />
                    <h3 className="text-xl font-bold">Normal</h3>
                  </div>
                  <p className="text-sm mb-4">
                    Standard business data. Accessible to all authorized users.
                  </p>
                  <div className="text-xs space-y-1">
                    <div>• All roles can access</div>
                    <div>• No special requirements</div>
                    <div>• Standard security measures</div>
                  </div>
                </div>

                {/* Confidential */}
                <div className={`p-6 rounded-xl border-2 ${getClassificationColor('Confidential')}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <FiLock className="text-2xl" />
                    <h3 className="text-xl font-bold">Confidential</h3>
                  </div>
                  <p className="text-sm mb-4">
                    Sensitive data requiring restricted access. Admin and Security roles only.
                  </p>
                  <div className="text-xs space-y-1">
                    <div>• Admin and Security only</div>
                    <div>• MFA required</div>
                    <div>• Enhanced logging</div>
                  </div>
                </div>

                {/* Restricted */}
                <div className={`p-6 rounded-xl border-2 ${getClassificationColor('Restricted')}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <FiLock className="text-2xl" />
                    <h3 className="text-xl font-bold">Restricted</h3>
                  </div>
                  <p className="text-sm mb-4">
                    Highly sensitive data. Security role only with approval required.
                  </p>
                  <div className="text-xs space-y-1">
                    <div>• Security role only</div>
                    <div>• MFA + Approval required</div>
                    <div>• Full audit trail</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Access Rules Tab */}
        {activeTab === 'access-rules' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Access Rules
              </h2>
              <button onClick={handleCreateRule} className="btn-primary">
                <FiPlus /> Create Rule
              </button>
            </div>

            <div className="card">
              {accessRules.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FiShield className="text-4xl mx-auto mb-3 opacity-50" />
                  <p>No access rules defined</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accessRules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-6 rounded-xl border-2 ${
                        rule.enabled
                          ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {rule.name}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getClassificationColor(rule.classification)}`}>
                              {rule.classification}
                            </span>
                            {!rule.enabled && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                Disabled
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {rule.description}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Allowed Roles:</span>{' '}
                              <span className="text-gray-600 dark:text-gray-400">
                                {rule.allowedRoles.join(', ')}
                              </span>
                            </div>
                            {rule.requiresMFA && (
                              <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                                <FiLock className="text-xs" />
                                <span>MFA Required</span>
                              </div>
                            )}
                            {rule.requiresApproval && (
                              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                <FiSettings className="text-xs" />
                                <span>Approval Required</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditRule(rule)}
                            className="btn-secondary px-3 py-1.5"
                            title="Edit"
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => {
                              setRuleToDelete(rule)
                              setShowDeleteRuleConfirm(true)
                            }}
                            className="btn-danger px-3 py-1.5"
                            title="Delete"
                          >
                            <FiTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit-log' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Audit Log
            </h2>

            {/* Filters */}
            <div className="card">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => {
                      setAuditSearchQuery(e.target.value)
                      setAuditCurrentPage(1)
                    }}
                    placeholder="Search by user, resource, or action..."
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <select
                  value={auditFilterAction}
                  onChange={(e) => {
                    setAuditFilterAction(e.target.value)
                    setAuditCurrentPage(1)
                  }}
                  className="px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="all">All Actions</option>
                  <option value="access">Access</option>
                  <option value="view">View</option>
                  <option value="download">Download</option>
                  <option value="upload">Upload</option>
                  <option value="delete">Delete</option>
                  <option value="modify">Modify</option>
                  <option value="share">Share</option>
                </select>
                <select
                  value={auditFilterClassification}
                  onChange={(e) => {
                    setAuditFilterClassification(e.target.value)
                    setAuditCurrentPage(1)
                  }}
                  className="px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="all">All Classifications</option>
                  <option value="Normal">Normal</option>
                  <option value="Confidential">Confidential</option>
                  <option value="Restricted">Restricted</option>
                </select>
              </div>
            </div>

            {/* Audit Log Table */}
            <div className="card overflow-hidden">
              {filteredAuditLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <FiFile className="text-4xl mx-auto mb-3 opacity-50" />
                  <p>No audit logs found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Resource
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Classification
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedAuditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                              {formatDate(log.timestamp)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {log.userName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {getActionIcon(log.action)}
                                <span className="text-sm text-gray-900 dark:text-white capitalize">
                                  {log.action}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{log.resourceName}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{log.resourceType}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {log.classification ? (
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getClassificationColor(log.classification)}`}>
                                  {log.classification}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {log.success ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                  Success
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                  Denied
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {auditTotalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {(auditCurrentPage - 1) * auditItemsPerPage + 1} to{' '}
                        {Math.min(auditCurrentPage * auditItemsPerPage, filteredAuditLogs.length)} of{' '}
                        {filteredAuditLogs.length} entries
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAuditCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={auditCurrentPage === 1}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                        >
                          <FiChevronLeft /> Previous
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, auditTotalPages) }, (_, i) => {
                            const page = i + 1
                            return (
                              <button
                                key={page}
                                onClick={() => setAuditCurrentPage(page)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  auditCurrentPage === page
                                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                              >
                                {page}
                              </button>
                            )
                          })}
                        </div>
                        <button
                          onClick={() => setAuditCurrentPage(prev => Math.min(auditTotalPages, prev + 1))}
                          disabled={auditCurrentPage === auditTotalPages}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                        >
                          Next <FiChevronRight />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* AI Security Dashboard Tab */}
        {activeTab === 'ai-security' && (
          <div className="space-y-6">
            <AISecurityDashboard />
          </div>
        )}

        {/* Incident Management Tab */}
        {activeTab === 'incidents' && (
          <div className="space-y-6">
            <SecurityIncidentManagement />
          </div>
        )}

        {/* Create/Edit Rule Modal */}
        <Modal
          isOpen={showRuleModal}
          onClose={() => {
            setShowRuleModal(false)
            resetRuleForm()
          }}
          title={editingRule ? 'Edit Access Rule' : 'Create Access Rule'}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Rule Name *
              </label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Enter rule name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={ruleDescription}
                onChange={(e) => setRuleDescription(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                rows={3}
                placeholder="Enter rule description"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Classification Level *
              </label>
              <select
                value={ruleClassification}
                onChange={(e) => setRuleClassification(e.target.value as Classification)}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="Normal">Normal</option>
                <option value="Confidential">Confidential</option>
                <option value="Restricted">Restricted</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Allowed Roles *
              </label>
              <div className="space-y-2">
                {(['user', 'admin', 'security'] as const).map((r) => (
                  <label key={r} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ruleAllowedRoles.includes(r)}
                      onChange={() => toggleRole(r)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-900 dark:text-white capitalize">{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ruleRequiresMFA}
                  onChange={(e) => setRuleRequiresMFA(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-white">Require MFA</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ruleRequiresApproval}
                  onChange={(e) => setRuleRequiresApproval(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-white">Require Approval</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ruleEnabled}
                  onChange={(e) => setRuleEnabled(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-900 dark:text-white">Enabled</span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowRuleModal(false)
                  resetRuleForm()
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={handleSaveRule} className="btn-primary flex-1">
                {editingRule ? 'Update' : 'Create'} Rule
              </button>
            </div>
          </div>
        </Modal>

        {/* Delete Rule Confirmation */}
        <ConfirmDialog
          isOpen={showDeleteRuleConfirm}
          onCancel={() => {
            setShowDeleteRuleConfirm(false)
            setRuleToDelete(null)
          }}
          onConfirm={handleDeleteRule}
          title="Delete Access Rule"
          message={`Are you sure you want to delete "${ruleToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
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
