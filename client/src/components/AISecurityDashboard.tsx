import { useState, useEffect } from 'react'
import { 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaCheckCircle, 
  FaLock, 
  FaUserShield,
  FaChartLine,
  FaSync,
  FaInfoCircle
} from 'react-icons/fa'

interface SecurityThreat {
  id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  timestamp: string
  recommendation: string
}

interface SecurityAnalysis {
  threatLevel: string
  riskScore: number
  patterns: string[]
  anomalies: SecurityThreat[]
  recommendations: string[]
}

export default function AISecurityDashboard() {
  const [analysis, setAnalysis] = useState<SecurityAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchSecurityAnalysis = async () => {
    setLoading(true)
    try {
      const API_URL = (import.meta as any).env.VITE_API_URL || '/api'
      const token = localStorage.getItem('token') || 'mock-token-for-testing'
      
      // Get audit logs for analysis
      const { getJSON } = await import('../data/storage')
      const { AUDIT_LOGS_KEY } = await import('../data/keys')
      const auditLogs = getJSON<any[]>(AUDIT_LOGS_KEY, []) || []

      const response = await fetch(`${API_URL}/ai/security-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          events: auditLogs.slice(-100),
          logs: auditLogs.slice(-100),
          timeRange: '24h'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAnalysis({
          threatLevel: data.threatLevel || 'Low',
          riskScore: data.riskScore || 0,
          patterns: data.patterns || [],
          anomalies: data.anomalies || [],
          recommendations: data.recommendations || []
        })
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Security analysis error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSecurityAnalysis()
    // Refresh every 5 minutes
    const interval = setInterval(fetchSecurityAnalysis, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getThreatLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-500'
      case 'high':
        return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 border-orange-500'
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500'
      default:
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-500'
    }
  }

  const getRiskScoreColor = (score: number) => {
    if (score >= 75) return 'text-red-600 dark:text-red-400'
    if (score >= 50) return 'text-orange-600 dark:text-orange-400'
    if (score >= 25) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
            <FaShieldAlt className="text-white text-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              AI Security Dashboard
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Real-time threat analysis powered by AI
            </p>
          </div>
        </div>
        <button
          onClick={fetchSecurityAnalysis}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <FaSync className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading && !analysis ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Analyzing security threats...</p>
        </div>
      ) : analysis ? (
        <div className="space-y-6">
          {/* Threat Level & Risk Score */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className={`p-6 rounded-xl border-2 ${getThreatLevelColor(analysis.threatLevel)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Threat Level</span>
                <FaShieldAlt className="text-2xl" />
              </div>
              <div className="text-3xl font-bold mb-1">
                {analysis.threatLevel}
              </div>
              <p className="text-xs opacity-75">
                Current security posture
              </p>
            </div>

            <div className="p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Risk Score</span>
                <FaChartLine className={`text-2xl ${getRiskScoreColor(analysis.riskScore)}`} />
              </div>
              <div className={`text-3xl font-bold mb-1 ${getRiskScoreColor(analysis.riskScore)}`}>
                {analysis.riskScore}/100
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    analysis.riskScore >= 75 ? 'bg-red-600' :
                    analysis.riskScore >= 50 ? 'bg-orange-600' :
                    analysis.riskScore >= 25 ? 'bg-yellow-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${analysis.riskScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Detected Patterns */}
          {analysis.patterns.length > 0 && (
            <div className="p-4 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FaInfoCircle className="text-blue-600 dark:text-blue-400" />
                Detected Patterns
              </h3>
              <ul className="space-y-2">
                {analysis.patterns.map((pattern, idx) => (
                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                    <span>{pattern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Anomalies */}
          {analysis.anomalies.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FaExclamationTriangle className="text-orange-600 dark:text-orange-400" />
                Detected Anomalies ({analysis.anomalies.length})
              </h3>
              <div className="space-y-3">
                {analysis.anomalies.map((anomaly) => (
                  <div
                    key={anomaly.id}
                    className={`p-4 rounded-xl border-2 ${
                      anomaly.severity === 'critical' || anomaly.severity === 'high'
                        ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                        : 'border-yellow-500 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            anomaly.severity === 'critical' || anomaly.severity === 'high'
                              ? 'bg-red-600 text-white'
                              : 'bg-yellow-600 text-white'
                          }`}>
                            {anomaly.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
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
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div className="p-4 rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FaCheckCircle className="text-green-600 dark:text-green-400" />
                AI Recommendations
              </h3>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                    <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* No Threats */}
          {analysis.anomalies.length === 0 && analysis.patterns.length === 0 && (
            <div className="text-center py-12">
              <FaCheckCircle className="text-5xl mx-auto mb-4 text-green-500 opacity-50" />
              <p className="text-gray-600 dark:text-gray-400">
                No security threats detected
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                System is secure and operating normally
              </p>
            </div>
          )}

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-xs text-gray-500 dark:text-gray-500 text-center pt-4 border-t border-gray-200 dark:border-gray-700">
              Last updated: {lastUpdated.toLocaleString()}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <FaInfoCircle className="text-4xl mx-auto mb-3 opacity-50" />
          <p>Unable to load security analysis</p>
        </div>
      )}
    </div>
  )
}

