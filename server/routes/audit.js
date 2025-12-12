import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { getAuditLogs, exportAuditLogs } from '../utils/audit.js'
import { securityRateLimit } from '../middleware/security.js'

const router = express.Router()

// Get audit logs (with rate limiting)
router.get('/logs', authenticate, securityRateLimit, async (req, res) => {
  try {
    const { userId, eventType, startDate, endDate, limit } = req.query
    
    const filters = {
      userId: userId || req.user._id.toString(),
      eventType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 1000
    }
    
    const logs = await getAuditLogs(filters)
    res.json({ logs, count: logs.length })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Export audit logs for compliance
router.get('/export', authenticate, securityRateLimit, async (req, res) => {
  try {
    const { format = 'json', startDate, endDate } = req.query
    
    const filters = {
      userId: req.user._id.toString(),
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    }
    
    const exported = await exportAuditLogs(filters, format)
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv')
      res.send(exported)
    } else {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.json')
      res.send(exported)
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// SIEM export endpoint
router.get('/siem', authenticate, securityRateLimit, async (req, res) => {
  try {
    const logs = await getAuditLogs({ userId: req.user._id.toString(), limit: 10000 })
    
    // Format for SIEM (Splunk/ELK compatible)
    const siemFormat = logs.map(log => ({
      '@timestamp': log.timestamp.toISOString(),
      event_type: log.eventType,
      user_id: log.userId.toString(),
      details: log.details,
      metadata: log.metadata,
      ip_address: log.ipAddress,
      user_agent: log.userAgent,
      device_fingerprint: log.deviceFingerprint
    }))
    
    res.json({ events: siemFormat, count: siemFormat.length })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router


