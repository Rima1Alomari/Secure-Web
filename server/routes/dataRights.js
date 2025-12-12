import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { logAuditEvent } from '../utils/audit.js'
import { deviceFingerprint } from '../middleware/security.js'
import User from '../models/User.js'
import File from '../models/File.js'
import DataRightsRequest from '../models/DataRightsRequest.js'

const router = express.Router()

// Submit data rights request (PDPL)
router.post('/request', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const { type, reason } = req.body

    if (!['access', 'deletion', 'portability'].includes(type)) {
      return res.status(400).json({ error: 'Invalid request type' })
    }

    const request = new DataRightsRequest({
      user: req.user._id,
      type,
      reason,
      status: 'pending'
    })

    await request.save()

    await logAuditEvent('data_rights_request', req.user._id.toString(), `PDPL ${type} request submitted`, {
      requestId: request._id.toString(),
      type,
      ipAddress: req.ip,
      deviceFingerprint: req.deviceFingerprint
    })

    // Auto-process access and portability requests
    if (type === 'access' || type === 'portability') {
      // In production, generate and send data export
      setTimeout(async () => {
        request.status = 'completed'
        await request.save()
      }, 1000)
    }

    res.json({ request, message: 'Request submitted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get user's data rights requests
router.get('/requests', authenticate, async (req, res) => {
  try {
    const requests = await DataRightsRequest.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.json({ requests })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Export user data (PDPL portability)
router.get('/export', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    const files = await File.find({ owner: req.user._id })

    const exportData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      files: files.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        uploadedAt: f.createdAt
      })),
      exportedAt: new Date()
    }

    await logAuditEvent('data_export', req.user._id.toString(), 'User data exported (PDPL)', {
      ipAddress: req.ip,
      deviceFingerprint: req.deviceFingerprint
    })

    res.json(exportData)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Delete user data (PDPL deletion)
router.post('/delete', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const { confirm } = req.body

    if (confirm !== 'DELETE') {
      return res.status(400).json({ error: 'Confirmation required' })
    }

    // Mark user as deleted (soft delete)
    await User.findByIdAndUpdate(req.user._id, { deleted: true, deletedAt: new Date() })

    await logAuditEvent('data_deletion', req.user._id.toString(), 'User data deletion requested (PDPL)', {
      ipAddress: req.ip,
      deviceFingerprint: req.deviceFingerprint
    })

    res.json({ message: 'Data deletion request submitted. Processing will complete within 30 days.' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router


