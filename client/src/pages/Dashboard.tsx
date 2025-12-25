import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { 
  FaCalendarAlt, 
  FaChevronRight,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa'
import { Toast } from '../components/common'
import { getJSON } from '../data/storage'
import { EVENTS_KEY, AUDIT_LOGS_KEY } from '../data/keys'
import { EventItem, AuditLog } from '../types/models'
import { useUser } from '../contexts/UserContext'
import { getScreenshotAttempts } from '../utils/screenshotProtection'

const Dashboard = () => {
  const navigate = useNavigate()
  const { role, user } = useUser()
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)

  useEffect(() => {
    // Simulate loading for 600ms
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // Listen for real-time screenshot attempts and events updates
  useEffect(() => {
    const handleScreenshotAttempt = () => {
      // Trigger refresh of security alerts
      setRefreshKey((prev: number) => prev + 1)
    }

    const handleEventsUpdated = () => {
      // Trigger refresh of upcoming meetings when events are updated
      setRefreshKey((prev: number) => prev + 1)
    }

    window.addEventListener('screenshot-attempt', handleScreenshotAttempt)
    window.addEventListener('events-updated', handleEventsUpdated)
    return () => {
      window.removeEventListener('screenshot-attempt', handleScreenshotAttempt)
      window.removeEventListener('events-updated', handleEventsUpdated)
    }
  }, [])


  // Get upcoming meetings (next 3-5) - connected to Calendar events
  const upcomingMeetings = useMemo(() => {
    const allEvents = getJSON<EventItem[]>(EVENTS_KEY, []) || []
    const now = new Date()
    
    return allEvents
      .map(e => {
        // Parse event date and time to get actual start datetime
        const eventDate = typeof e.date === 'string' ? new Date(e.date) : new Date(e.date)
        const timeStr = e.time || '09:00 - 10:00'
        const fromTime = timeStr.split(' - ')[0] || '09:00'
        const [hours, minutes] = fromTime.split(':').map(Number)
        
        // Create full datetime for event start
        const eventStart = new Date(eventDate)
        eventStart.setHours(hours || 9, minutes || 0, 0, 0)
        
        return {
          event: e,
          eventStart // Add computed start datetime
        }
      })
      .filter(item => {
        // Filter for events where start >= now
        return item.eventStart >= now
      })
      .sort((a, b) => a.eventStart.getTime() - b.eventStart.getTime())
      .slice(0, 5) // Show next 3-5 meetings (max 5)
      .map(item => item.event) // Return just the events
  }, [refreshKey])


  // Get security alerts from audit logs and screenshot attempts
  const securityAlerts = useMemo(() => {
    const allAuditLogs = getJSON<AuditLog[]>(AUDIT_LOGS_KEY, []) || []
    const screenshotAttempts = getScreenshotAttempts()
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    // Get alerts from audit logs
    const auditAlerts = allAuditLogs
      .filter(log => {
        const logTime = new Date(log.timestamp)
        return logTime >= last24Hours && 
               (log.action === 'access' && !log.success || 
                log.action === 'delete' || 
                log.classification === 'Restricted' ||
                log.action === 'modify' ||
                log.action === 'screenshot_attempt')
      })
      .map(log => ({
        id: log.id,
        type: log.action === 'delete' ? 'critical' : 
              log.action === 'screenshot_attempt' ? 'high' :
              log.classification === 'Restricted' ? 'high' : 'medium',
        message: log.action === 'screenshot_attempt' 
          ? `Screenshot attempt blocked at ${log.details?.location || 'unknown location'}`
          : `${log.action} attempt on ${log.resourceName}`,
        timestamp: log.timestamp,
        status: log.success ? 'Resolved' : 'Investigating',
        location: log.details?.location || undefined
      }))

    // Get alerts from screenshot attempts (for non-admin users)
    const screenshotAlerts = screenshotAttempts
      .filter(attempt => {
        const attemptTime = new Date(attempt.timestamp)
        return attemptTime >= last24Hours && attempt.blocked
      })
      .map(attempt => ({
        id: attempt.id,
        type: 'high' as const,
        message: `Screenshot attempt blocked at ${attempt.location}`,
        timestamp: attempt.timestamp,
        status: 'Investigating' as const,
        location: attempt.location,
        userName: attempt.userName
      }))

    // Combine and sort by timestamp (most recent first)
    const allAlerts = [...auditAlerts, ...screenshotAlerts]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)

    return allAlerts
  }, [refreshKey])

  // Get active security incidents (for admin)
  const activeSecurityIncidents = useMemo(() => {
    if (role !== 'admin') return []
    
    const incidents = getJSON<any[]>('security-incidents', []) || []
    return incidents
      .filter(incident => 
        incident.status === 'open' || 
        incident.status === 'investigating' || 
        incident.status === 'contained'
      )
      .sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        return (severityOrder[b.severity as keyof typeof severityOrder] || 0) - 
               (severityOrder[a.severity as keyof typeof severityOrder] || 0)
      })
      .slice(0, 3)
  }, [role, refreshKey])





  const handleMeetingClick = (event: EventItem) => {
    // Navigate to Calendar and focus the event
    navigate('/calendar', { state: { focusEventId: event.id } })
  }

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="page-container">
          <div className="space-y-8 animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded-lg w-48"></div>
            <div className="card space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
              ))}
            </div>
            <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded-lg w-48"></div>
            <div className="card space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
              ))}
            </div>
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
          <h1 className="page-title">Dashboard</h1>
        </div>

        {/* Security Collaboration Section - For Admin */}
        {role === 'admin' && activeSecurityIncidents.length > 0 && (
          <div className="mb-4">
            <div className="card p-4 border-l-4 border-l-red-600">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaShieldAlt className="text-red-600 dark:text-red-400 text-base" />
                  Active Security Incidents
                </h2>
                <button
                  onClick={() => navigate('/security', { state: { tab: 'incidents' } })}
                  className="text-xs text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1"
                >
                  Manage all <FaChevronRight className="text-[10px]" />
                </button>
              </div>
              <div className="space-y-2">
                {activeSecurityIncidents.map((incident: any) => (
                  <div
                    key={incident.id}
                    className={`p-3 rounded-md border ${
                      incident.severity === 'critical'
                        ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                        : incident.severity === 'high'
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            incident.severity === 'critical' ? 'bg-red-700 text-white' :
                            incident.severity === 'high' ? 'bg-red-600 text-white' :
                            incident.severity === 'medium' ? 'bg-yellow-600 text-white' :
                            'bg-blue-600 text-white'
                          }`}>
                            {incident.severity?.toUpperCase()}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            incident.status === 'open' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                            incident.status === 'investigating' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          }`}>
                            {incident.status?.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                          {incident.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                          {incident.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security Alerts - Admin Only */}
        {role === 'admin' && (
          <div className="mb-4">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaShieldAlt className="text-slate-600 dark:text-slate-400 text-base" />
                  Security Alerts
                </h2>
                <button
                  onClick={() => navigate('/security')}
                  className="text-xs text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1"
                >
                  View all <FaChevronRight className="text-[10px]" />
                </button>
              </div>
            
            {securityAlerts.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <FaCheckCircle className="text-2xl mx-auto mb-2 opacity-50 text-green-500" />
                <p className="text-xs">No security alerts in the last 24 hours</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {securityAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-2 rounded-lg border ${
                      alert.type === 'critical'
                        ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                        : alert.type === 'high'
                        ? 'border-orange-500 dark:border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                        : 'border-yellow-500 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <FaExclamationTriangle className={`text-xs flex-shrink-0 ${
                            alert.type === 'critical' ? 'text-red-600' : 
                            alert.type === 'high' ? 'text-orange-600' : 'text-yellow-600'
                          }`} />
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            alert.type === 'critical'
                              ? 'bg-red-600 text-white'
                              : alert.type === 'high'
                              ? 'bg-orange-600 text-white'
                              : 'bg-yellow-600 text-white'
                          }`}>
                            {alert.type.toUpperCase()}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            alert.status === 'Resolved'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          }`}>
                            {alert.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-900 dark:text-white mb-0.5 line-clamp-1">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 flex-wrap">
                          <span>{new Date(alert.timestamp).toLocaleString()}</span>
                          {'location' in alert && alert.location && (
                            <span>
                              <span> • </span>
                              <span className="text-gray-400 dark:text-gray-500">Location: {alert.location}</span>
                            </span>
                          )}
                          {'userName' in alert && alert.userName && (
                            <span>
                              <span> • </span>
                              <span className="text-gray-400 dark:text-gray-500">User: {String(alert.userName)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upcoming Meetings Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Upcoming Meetings</h2>
              <button
                onClick={() => navigate('/calendar', { state: { filterUpcoming: true } })}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all <FaChevronRight className="text-xs" />
              </button>
            </div>
            
            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FaCalendarAlt className="text-4xl mx-auto mb-3 opacity-50" />
                <p>No upcoming meetings</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingMeetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    onClick={() => handleMeetingClick(meeting)}
                    className="w-full text-left p-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 min-h-[62px] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-0.5 truncate">
                          {meeting.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                          <FaCalendarAlt className="text-[10px]" />
                          <span>{typeof meeting.date === 'string' ? new Date(meeting.date).toLocaleDateString() : meeting.date.toLocaleDateString()}</span>
                          <span className="mx-1">•</span>
                          <span>{meeting.time}</span>
                        </div>
                      </div>
                      <FaChevronRight className="w-3.5 h-3.5 text-gray-400 opacity-60 flex-shrink-0 mt-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

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

export default Dashboard
