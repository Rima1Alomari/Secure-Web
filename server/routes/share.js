import express from 'express'
import { authenticate } from '../middleware/auth.js'
import File from '../models/File.js'
import Share from '../models/Share.js'
import { generateDownloadUrl } from '../config/s3.js'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'
import { logAuditEvent } from '../utils/audit.js'
import { deviceFingerprint } from '../middleware/security.js'

const router = express.Router()

router.post('/files/:id/share', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // In development mode, allow all users to share files
    if (process.env.NODE_ENV !== 'development') {
      if (file.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied' })
      }
    }

    const { password } = req.body
    const token = uuidv4()

    const share = new Share({
      file: file._id,
      token,
      password: password ? await bcrypt.hash(password, 10) : null
    })

    await share.save()

    await logAuditEvent('file_share', req.user._id.toString(), `File shared: ${file.name}`, {
      fileId: file._id.toString(),
      fileName: file.name,
      hasPassword: !!password,
      ipAddress: req.ip,
      deviceFingerprint: req.deviceFingerprint
    })

    res.json({ shareToken: token })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:token', deviceFingerprint, async (req, res) => {
  try {
    const share = await Share.findOne({ token: req.params.token }).populate('file')

    if (!share) {
      return res.status(404).json({ error: 'Share not found' })
    }

    if (share.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Share link expired' })
    }

    res.json({
      name: share.file.name,
      size: share.file.size,
      type: share.file.type,
      passwordProtected: !!share.password
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/:token/verify', deviceFingerprint, async (req, res) => {
  try {
    const { password } = req.body
    const share = await Share.findOne({ token: req.params.token }).populate('file')

    if (!share) {
      return res.status(404).json({ error: 'Share not found' })
    }

    if (share.password) {
      const isMatch = await bcrypt.compare(password, share.password)
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid password' })
      }
    }

    const downloadUrl = await generateDownloadUrl(share.file.s3Key, 3600)
    
    await logAuditEvent('file_download', 'shared', `Shared file accessed: ${share.file.name}`, {
      fileId: share.file._id.toString(),
      fileName: share.file.name,
      shareToken: req.params.token,
      ipAddress: req.ip,
      deviceFingerprint: req.deviceFingerprint
    })
    
    res.json({ downloadUrl })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router

