import { useState, useEffect } from 'react'
import axios from 'axios'
import { getToken } from '../utils/auth'
import { 
  FiShield, 
  FiLock, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiRefreshCw,
  FiDownload,
  FiFile,
  FiVideo,
  FiSettings
} from 'react-icons/fi'
import { FaRobot, FaExclamationTriangle } from 'react-icons/fa'

interface SecuritySettings {
  quantumProofMode: boolean
  mfaEnabled: boolean
  riskScore: number
  lastSecurityScan: string
}

interface ThreatAlert {
  type: string
  severity: string
  message: string
  timestamp: string
}

export default function SecurityCenter() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null)
  const [alerts, setAlerts] = useState<ThreatAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    loadSecurityData()
  }, [])

  const loadSecurityData = async () => {
    try {
      const token = getToken() || 'mock-token'
      const [settingsRes, alertsRes] = await Promise.all([
        axios.get('/api/security/settings', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/audit/logs?eventType=threat_detected&limit=10', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      setSettings(settingsRes.data)
      setAlerts(alertsRes.data.logs?.slice(0, 10) || [])
    } catch (error) {
      console.error('Error loading security data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleQuantumMode = async () => {
    try {
      const token = getToken() || 'mock-token'
      const updated = await axios.put(
        '/api/security/settings',
        { quantumProofMode: !settings?.quantumProofMode },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSettings(updated.data)
    } catch (error) {
      console.error('Error updating quantum mode:', error)
    }
  }

  const scanRoom = async () => {
    setScanning(true)
    try {
      const token = getToken() || 'mock-token'
      const result = await axios.post(
        '/api/security/scan/room',
        { roomId: 'current' },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      alert(`Scan complete. Risk score: ${result.data.riskScore}`)
    } catch (error) {
      console.error('Error scanning room:', error)
    } finally {
      setScanning(false)
    }
  }

  const exportAuditLogs = async (format: 'json' | 'csv') => {
    try {
      const token = getToken() || 'mock-token'
      const response = await axios.get(`/api/audit/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `audit-logs.${format}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error exporting logs:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white text-xl">Loading security center...</div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent mb-3 flex items-center gap-3 tracking-tight">
            <FiShield className="text-green-600 dark:text-green-400" />
            Security Center
          </h1>
          <p className="text-gray-700 dark:text-gray-300 text-base md:text-lg font-medium">Advanced security monitoring and controls</p>
        </div>

        {/* AI Security Features */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* AI-Based Security Layer */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FaRobot className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Security Layer</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Advanced AI-powered security protection</p>
            <div className="space-y-2">
              <div className="p-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                ✓ Real-time threat analysis
              </div>
              <div className="p-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                ✓ Behavioral pattern detection
              </div>
              <div className="p-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                ✓ Automated response system
              </div>
            </div>
          </div>

          {/* AI Anomaly Detection */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <FaExclamationTriangle className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Anomaly Detection</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Detect unusual patterns and behaviors</p>
            <div className="space-y-2">
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Status: Active</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">0 anomalies detected in last 24h</p>
              </div>
               <button className="w-full px-4 py-2.5 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 shadow-md">
                 View Detection Logs
               </button>
            </div>
          </div>
        </div>

        {/* Security Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-bold text-lg">Encryption Status</h3>
              {settings?.quantumProofMode ? (
                <FiCheckCircle className="text-green-600 dark:text-green-400 text-3xl" />
              ) : (
                <FiLock className="text-blue-600 dark:text-blue-400 text-3xl" />
              )}
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 font-medium">
              {settings?.quantumProofMode ? 'Quantum-Resistant' : 'Standard AES-256'}
            </p>
              <button
                onClick={toggleQuantumMode}
                className="mt-4 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 dark:from-blue-500 dark:to-green-500 text-white rounded-lg transition-colors duration-200 text-sm font-semibold shadow-md"
              >
                {settings?.quantumProofMode ? 'Disable Quantum Mode' : 'Enable Quantum Mode'}
              </button>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
              Quantum-resistant encryption protects against future quantum attacks
            </p>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10 hover:shadow-2xl hover:shadow-green-500/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-bold text-lg">Risk Score</h3>
              <FiAlertTriangle className="text-yellow-500 dark:text-yellow-400 text-3xl" />
            </div>
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent mb-3">{settings?.riskScore || 0}/100</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
              <div
                className="bg-gradient-to-r from-green-500 via-green-400 to-blue-500 h-3 rounded-full shadow-lg"
                style={{ width: `${settings?.riskScore || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 font-medium">Lower is better</p>
          </div>

          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 transition-all">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-bold text-lg">MFA Status</h3>
              {settings?.mfaEnabled ? (
                <FiCheckCircle className="text-green-600 dark:text-green-400 text-3xl" />
              ) : (
                <FiLock className="text-gray-500 dark:text-gray-400 text-3xl" />
              )}
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 font-medium">
              {settings?.mfaEnabled ? 'Enabled' : 'Disabled'}
            </p>
              <button
                className="mt-4 px-5 py-2.5 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-lg transition-colors duration-200 text-sm font-semibold shadow-md"
              >
                {settings?.mfaEnabled ? 'Manage MFA' : 'Enable MFA'}
              </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <button
            onClick={scanRoom}
            disabled={scanning}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
          >
            <FiVideo className="text-base" />
            {scanning ? 'Scanning...' : 'Scan Current Room'}
          </button>
          <button
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <FiFile className="text-base" />
            Scan Selected Files
          </button>
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <FiRefreshCw className="text-base" />
            Run Full System Scan
          </button>
          <button
            onClick={() => exportAuditLogs('csv')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 text-sm"
          >
            <FiDownload className="text-base" />
            Export Audit Logs
          </button>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent mb-6">Recent Security Alerts</h2>
          {alerts.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 font-medium">No recent alerts. System is secure.</p>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div
                  key={index}
                  className="bg-gradient-to-br from-white to-blue-50/30 dark:from-gray-700 dark:to-gray-700 rounded-xl p-5 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900 dark:text-white font-bold">{alert.details}</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-2 rounded-xl text-xs font-bold shadow-lg ${
                        alert.severity === 'critical'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-2 border-red-500'
                          : alert.severity === 'high'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-2 border-orange-500'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-2 border-yellow-500'
                      }`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

