/**
 * Client-side audit logging utility
 * Logs user actions for security and compliance tracking
 */

import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { AUDIT_LOGS_KEY } from '../data/keys'
import { AuditLog } from '../types/models'
import { useUser } from '../contexts/UserContext'

/**
 * Log an audit event
 */
export function logAuditEvent(
  action: AuditLog['action'],
  resourceType: AuditLog['resourceType'],
  resourceId: string,
  resourceName: string,
  success: boolean = true,
  classification?: AuditLog['classification'],
  reason?: string
) {
  try {
    // Get current user from localStorage (since we can't use hooks here)
    const userData = localStorage.getItem('user')
    const user = userData ? JSON.parse(userData) : null
    
    const auditLog: AuditLog = {
      id: uuid(),
      userId: user?.id || 'unknown',
      userName: user?.name || user?.email || 'Unknown User',
      action,
      resourceType,
      resourceId,
      resourceName,
      classification,
      timestamp: nowISO(),
      ipAddress: undefined, // Would be set by server
      userAgent: navigator.userAgent,
      success,
      reason
    }

    // Get existing logs
    const existingLogs = getJSON<AuditLog[]>(AUDIT_LOGS_KEY, []) || []
    
    // Add new log (keep last 1000 logs)
    const updatedLogs = [auditLog, ...existingLogs].slice(0, 1000)
    
    // Save to localStorage
    setJSON(AUDIT_LOGS_KEY, updatedLogs)

    // Also try to send to server if available
    const API_URL = (import.meta as any).env.VITE_API_URL || '/api'
    const token = localStorage.getItem('token')
    
    if (token && token !== 'mock-token-for-testing') {
      fetch(`${API_URL}/audit/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(auditLog)
      }).catch(err => {
        console.warn('Failed to send audit log to server:', err)
      })
    }

    return auditLog
  } catch (error) {
    console.error('Failed to log audit event:', error)
    return null
  }
}

/**
 * Get audit logs with optional filters
 */
export function getAuditLogs(filters?: {
  userId?: string
  action?: AuditLog['action']
  resourceType?: AuditLog['resourceType']
  startDate?: Date
  endDate?: Date
  limit?: number
}): AuditLog[] {
  try {
    const allLogs = getJSON<AuditLog[]>(AUDIT_LOGS_KEY, []) || []
    
    let filtered = allLogs

    if (filters) {
      if (filters.userId) {
        filtered = filtered.filter(log => log.userId === filters.userId)
      }
      if (filters.action) {
        filtered = filtered.filter(log => log.action === filters.action)
      }
      if (filters.resourceType) {
        filtered = filtered.filter(log => log.resourceType === filters.resourceType)
      }
      if (filters.startDate) {
        filtered = filtered.filter(log => new Date(log.timestamp) >= filters.startDate!)
      }
      if (filters.endDate) {
        filtered = filtered.filter(log => new Date(log.timestamp) <= filters.endDate!)
      }
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Apply limit
    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit)
    }

    return filtered
  } catch (error) {
    console.error('Failed to get audit logs:', error)
    return []
  }
}

/**
 * Helper functions for common audit events
 */
export const auditHelpers = {
  logFileUpload: (fileName: string, fileId: string, classification?: AuditLog['classification']) => {
    return logAuditEvent('upload', 'file', fileId, fileName, true, classification)
  },

  logFileDownload: (fileName: string, fileId: string, classification?: AuditLog['classification']) => {
    return logAuditEvent('download', 'file', fileId, fileName, true, classification)
  },

  logFileDelete: (fileName: string, fileId: string, classification?: AuditLog['classification']) => {
    return logAuditEvent('delete', 'file', fileId, fileName, true, classification)
  },

  logFileShare: (fileName: string, fileId: string, classification?: AuditLog['classification']) => {
    return logAuditEvent('share', 'file', fileId, fileName, true, classification)
  },

  logFileView: (fileName: string, fileId: string, classification?: AuditLog['classification']) => {
    return logAuditEvent('view', 'file', fileId, fileName, true, classification)
  },

  logRoomCreate: (roomName: string, roomId: string) => {
    return logAuditEvent('access', 'room', roomId, roomName, true)
  },

  logRoomJoin: (roomName: string, roomId: string) => {
    return logAuditEvent('access', 'room', roomId, roomName, true)
  },

  logAccessDenied: (
    resourceType: AuditLog['resourceType'],
    resourceId: string,
    resourceName: string,
    reason: string,
    classification?: AuditLog['classification']
  ) => {
    return logAuditEvent('access', resourceType, resourceId, resourceName, false, classification, reason)
  }
}

