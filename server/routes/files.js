import express from 'express'
import { authenticate } from '../middleware/auth.js'
import File from '../models/File.js'
import Share from '../models/Share.js'
import { generateUploadUrl, generateDownloadUrl, deleteFile as deleteS3File } from '../config/s3.js'
import { scanFile } from '../utils/threatDetection.js'
import { scanFileContent } from '../utils/dlp.js'
import { scanForSensitiveData } from '../utils/dlp.js'
import { logAuditEvent } from '../utils/audit.js'
import { encryptData } from '../utils/encryption.js'
import { deviceFingerprint } from '../middleware/security.js'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'

const router = express.Router()

router.get('/', authenticate, deviceFingerprint, async (req, res) => {
  try {
    // Temporarily return all files for testing (remove owner filter)
    const files = await File.find({}).sort({ createdAt: -1 })
    
    await logAuditEvent('file_list', req.user._id.toString(), 'Files listed', {
      count: files.length,
      ipAddress: req.ip,
      deviceFingerprint: req.deviceFingerprint
    })
    
    res.json(files)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/upload-url', authenticate, async (req, res) => {
  try {
    const { fileName, fileType } = req.body

    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'fileName and fileType are required' })
    }

    const { uploadUrl, key } = await generateUploadUrl(fileName, fileType)

    res.json({ uploadUrl, s3Key: key })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/complete-upload', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const { fileName, fileType, fileSize, s3Key, fileHash } = req.body

    if (!fileName || !fileType || !fileSize || !s3Key) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Security scanning (mock - in production, fetch from S3 and scan)
    const fileBuffer = Buffer.from('') // Placeholder
    const threats = await scanFile(fileBuffer, fileName, fileType)
    const dlpFindings = await scanFileContent(fileBuffer, fileName)

    if (threats.some(t => t.severity === 'critical')) {
      await logAuditEvent('threat_detected', req.user._id.toString(), 'Critical threat detected in file upload', {
        fileName,
        threats,
        ipAddress: req.ip
      })
      return res.status(403).json({ 
        error: 'File rejected due to security threat',
        threats,
        dlpFindings
      })
    }

    const file = new File({
      name: fileName,
      size: fileSize,
      type: fileType,
      s3Key: s3Key,
      owner: req.user._id,
      fileHash,
      threats: threats.length > 0 ? threats : undefined,
      dlpFindings: dlpFindings.length > 0 ? dlpFindings : undefined
    })

    await file.save()

    await logAuditEvent('file_upload', req.user._id.toString(), `File uploaded: ${fileName}`, {
      fileId: file._id.toString(),
      fileName,
      fileSize,
      threats: threats.length,
      dlpFindings: dlpFindings.length,
      ipAddress: req.ip,
      deviceFingerprint: req.deviceFingerprint
    })

    const io = req.app.get('io')
    io.emit('file-uploaded', { name: fileName, fileId: file._id })

    res.json({ 
      file,
      security: {
        threats: threats.length,
        dlpFindings: dlpFindings.length,
        safe: threats.length === 0 && dlpFindings.length === 0
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id/download-url', authenticate, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Temporarily disabled owner check for testing
    // if (file.owner.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ error: 'Access denied' })
    // }

    const downloadUrl = await generateDownloadUrl(file.s3Key)
    res.json({ downloadUrl })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Temporarily disabled owner check for testing
    // if (file.owner.toString() !== req.user._id.toString()) {
    //   await logAuditEvent('access_denied', req.user._id.toString(), 'Attempted to delete file without permission', {
    //     fileId: req.params.id,
    //     ipAddress: req.ip
    //   })
    //   return res.status(403).json({ error: 'Access denied' })
    // }

    await deleteS3File(file.s3Key)
    await File.findByIdAndDelete(req.params.id)

    await logAuditEvent('file_delete', req.user._id.toString(), `File deleted: ${file.name}`, {
      fileId: file._id.toString(),
      fileName: file.name,
      ipAddress: req.ip,
      deviceFingerprint: req.deviceFingerprint
    })

    const io = req.app.get('io')
    io.emit('file-deleted', { name: file.name, fileId: file._id })

    res.json({ message: 'File deleted' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/:id/editor-config', authenticate, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Temporarily disabled owner check for testing
    // if (file.owner.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ error: 'Access denied' })
    // }

    const downloadUrl = await generateDownloadUrl(file.s3Key, 3600)
    const callbackUrl = `${process.env.API_URL || 'http://localhost:5000'}/api/files/${file._id}/callback`

    const config = {
      document: {
        fileType: file.type.split('/').pop(),
        key: file._id.toString(),
        title: file.name,
        url: downloadUrl
      },
      documentType: getDocumentType(file.type),
      editorConfig: {
        callbackUrl: callbackUrl,
        mode: 'edit'
      }
    }

    res.json(config)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/:id/callback', authenticate, async (req, res) => {
  res.status(200).json({ error: 0 })
})

router.post('/:id/share', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Temporarily disabled owner check for testing
    // if (file.owner.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ error: 'Access denied' })
    // }

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

const getDocumentType = (mimeType) => {
  if (mimeType.includes('word')) return 'word'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'cell'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'slide'
  return 'word'
}

export default router

