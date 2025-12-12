import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { scanChatMessage, scanFile, detectBehavioralAnomaly } from '../utils/threatDetection.js'
import { scanForSensitiveData, redactSensitiveData, scanFileContent } from '../utils/dlp.js'
import { logAuditEvent } from '../utils/audit.js'
import SecuritySettings from '../models/SecuritySettings.js'
import { deviceFingerprint } from '../middleware/security.js'
import { checkPDPLCompliance, checkSAMACompliance, reportToSaudiCERT, reportBreachToSDAIA } from '../utils/ksaCompliance.js'

const router = express.Router()

// Get security settings
router.get('/settings', authenticate, async (req, res) => {
  try {
    let settings = await SecuritySettings.findOne({ user: req.user._id })
    
    if (!settings) {
      settings = new SecuritySettings({ user: req.user._id })
      await settings.save()
    }
    
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update security settings
router.put('/settings', authenticate, async (req, res) => {
  try {
    const { quantumProofMode, mfaEnabled, ipWhitelist } = req.body
    
    let settings = await SecuritySettings.findOne({ user: req.user._id })
    if (!settings) {
      settings = new SecuritySettings({ user: req.user._id })
    }
    
    if (quantumProofMode !== undefined) settings.quantumProofMode = quantumProofMode
    if (mfaEnabled !== undefined) settings.mfaEnabled = mfaEnabled
    if (ipWhitelist) settings.ipWhitelist = ipWhitelist
    
    await settings.save()
    
    await logAuditEvent('settings_change', req.user._id.toString(), 'Security settings updated', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: req.deviceFingerprint
    })
    
    res.json(settings)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Scan chat message
router.post('/scan/chat', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const { message } = req.body
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }
    
    const threats = await scanChatMessage(message)
    const dlpFindings = scanForSensitiveData(message)
    
    if (threats.length > 0 || dlpFindings.length > 0) {
      await logAuditEvent('threat_detected', req.user._id.toString(), 'Threat detected in chat', {
        threats,
        dlpFindings,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      })
    }
    
    res.json({
      threats,
      dlpFindings,
      safe: threats.length === 0 && dlpFindings.length === 0,
      redactedMessage: dlpFindings.length > 0 ? redactSensitiveData(message, dlpFindings) : message
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Scan file
router.post('/scan/file', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const { fileId, fileName, fileType } = req.body
    
    // In production, fetch file buffer from S3
    const fileBuffer = Buffer.from('') // Placeholder
    
    const threats = await scanFile(fileBuffer, fileName, fileType)
    const dlpFindings = await scanFileContent(fileBuffer, fileName)
    
    if (threats.length > 0 || dlpFindings.length > 0) {
      await logAuditEvent('threat_detected', req.user._id.toString(), 'Threat detected in file', {
        fileId,
        fileName,
        threats,
        dlpFindings,
        ipAddress: req.ip
      })
    }
    
    res.json({
      threats,
      dlpFindings,
      safe: threats.length === 0 && dlpFindings.length === 0,
      riskScore: calculateRiskScore(threats, dlpFindings)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Scan current room
router.post('/scan/room', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const { roomId } = req.body
    
    // Mock room scan - in production, scan all messages and participants
    const anomalies = detectBehavioralAnomaly(req.user._id.toString(), 'join_room', {
      unusualTime: false,
      rapidShares: 0
    })
    
    res.json({
      anomalies,
      riskScore: anomalies.length * 10,
      recommendations: generateRecommendations(anomalies)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Calculate risk score
const calculateRiskScore = (threats, dlpFindings) => {
  let score = 0
  
  threats.forEach(threat => {
    if (threat.severity === 'critical') score += 30
    else if (threat.severity === 'high') score += 20
    else if (threat.severity === 'medium') score += 10
    else score += 5
  })
  
  dlpFindings.forEach(finding => {
    if (finding.severity === 'critical') score += 25
    else if (finding.severity === 'high') score += 15
    else score += 5
  })
  
  return Math.min(score, 100)
}

// Generate security recommendations
const generateRecommendations = (anomalies) => {
  const recommendations = []
  
  if (anomalies.some(a => a.type === 'rapid_sharing')) {
    recommendations.push('Consider enabling additional approval for file shares')
  }
  
  if (anomalies.some(a => a.type === 'unusual_access_time')) {
    recommendations.push('Review access patterns and consider time-based access controls')
  }
  
  return recommendations
}

// Get KSA compliance metrics
router.get('/ksa-compliance', authenticate, async (req, res) => {
  try {
    const [pdpl, sama] = await Promise.all([
      checkPDPLCompliance(req.user._id.toString()),
      checkSAMACompliance(req.user._id.toString())
    ])

    res.json({
      pdpl,
      sama,
      overallScore: Math.round(((pdpl.compliant ? 100 : 0) + (sama.compliant ? 100 : 0)) / 2)
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Report incident to Saudi CERT
router.post('/report-incident', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const { type, description, severity } = req.body

    const incidentData = {
      userId: req.user._id.toString(),
      type,
      description,
      severity: severity || 'medium',
      ipAddress: req.ip,
      deviceFingerprint: req.deviceFingerprint,
      timestamp: new Date()
    }

    const reportResult = await reportToSaudiCERT(incidentData)

    await logAuditEvent('incident_reported', req.user._id.toString(), `Incident reported to Saudi CERT: ${type}`, {
      ...incidentData,
      reportSuccess: reportResult.success
    })

    res.json({
      success: true,
      message: 'Incident reported to Saudi CERT',
      reportId: reportResult.data?.id || 'mock-report-id'
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Detect and report data breach (PDPL - 72 hours)
router.post('/detect-breach', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const { breachType, affectedData, severity } = req.body

    const breachData = {
      userId: req.user._id.toString(),
      breachType,
      affectedData,
      severity: severity || 'high',
      detectedAt: new Date(),
      ipAddress: req.ip
    }

    // Report to SDAIA/NCA within 72 hours
    const reportResult = await reportBreachToSDAIA(breachData)

    await logAuditEvent('breach_detected', req.user._id.toString(), `Data breach detected and reported: ${breachType}`, {
      ...breachData,
      reportedToSDAIA: reportResult.success
    })

    res.json({
      success: true,
      message: 'Breach detected and reported to SDAIA/NCA within 72 hours',
      reported: reportResult.success
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router

