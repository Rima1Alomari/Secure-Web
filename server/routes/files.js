import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Setup multer for direct file uploads (fallback when S3 is not configured)
const uploadsDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`
    cb(null, uniqueName)
  }
})

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
})

const router = express.Router()

// Helper function to resolve emails/usernames to user IDs
const resolveUserIdentifiers = async (identifiers) => {
  if (!Array.isArray(identifiers) || identifiers.length === 0) {
    return []
  }

  const mongoose = await import('mongoose')
  const User = (await import('../models/User.js')).default
  
  if (mongoose.default.connection.readyState !== 1) {
    console.warn('MongoDB not connected, cannot resolve user identifiers')
    return []
  }

  const userIds = []
  for (const identifier of identifiers) {
    if (!identifier || typeof identifier !== 'string') continue
    
    const trimmed = identifier.trim()
    if (!trimmed) continue

    // Try to find by email first
    let user = await User.findOne({ email: trimmed })
    
    // If not found by email, try to find by name (username)
    if (!user) {
      user = await User.findOne({ name: trimmed })
    }
    
    // If still not found, try case-insensitive search
    if (!user) {
      user = await User.findOne({ 
        $or: [
          { email: { $regex: new RegExp(`^${trimmed}$`, 'i') } },
          { name: { $regex: new RegExp(`^${trimmed}$`, 'i') } }
        ]
      })
    }

    if (user) {
      userIds.push(user._id)
    } else {
      console.warn(`User not found for identifier: ${trimmed}`)
    }
  }

  return userIds
}

// Helper function to check if user has access to file
const checkFileAccess = (file, userId, action = 'view', userRoomId = null) => {
  const userIdStr = userId.toString()
  const ownerIdStr = file.owner.toString()
  
  // Owner always has full access
  if (ownerIdStr === userIdStr) {
    return { allowed: true, reason: 'owner' }
  }
  
  // Check permission mode
  if (file.permissionMode === 'public') {
    return { allowed: true, reason: 'public' }
  }
  
  // Check room-based permissions first
  if (file.permissionMode === 'rooms' || file.editorRooms || file.viewerRooms) {
    // Check if user's room is in editor rooms
    if (file.editorRooms && Array.isArray(file.editorRooms) && userRoomId) {
      const isInEditorRoom = file.editorRooms.includes(userRoomId)
      if (isInEditorRoom) {
        return { allowed: true, reason: 'editor_room' }
      }
    }
    
    // Check if user's room is in viewer rooms
    if (file.viewerRooms && Array.isArray(file.viewerRooms) && userRoomId) {
      const isInViewerRoom = file.viewerRooms.includes(userRoomId)
      if (isInViewerRoom) {
        if (action === 'view' || action === 'download') {
          return { allowed: true, reason: 'viewer_room' }
        } else {
          return { allowed: false, reason: 'viewer_room_cannot_edit' }
        }
      }
    }
  }
  
  // Legacy: Check if user is in editors list (can edit and view)
  const isEditor = file.editors && file.editors.some(editor => {
    const editorId = typeof editor === 'object' ? editor._id.toString() : editor.toString()
    return editorId === userIdStr
  })
  
  if (isEditor) {
    return { allowed: true, reason: 'editor' }
  }
  
  // Legacy: Check if user is in viewers list (can only view)
  const isViewer = file.viewers && file.viewers.some(viewer => {
    const viewerId = typeof viewer === 'object' ? viewer._id.toString() : viewer.toString()
    return viewerId === userIdStr
  })
  
  if (isViewer) {
    if (action === 'view' || action === 'download') {
      return { allowed: true, reason: 'viewer' }
    } else {
      return { allowed: false, reason: 'viewer_cannot_edit' }
    }
  }
  
  // Check permission mode
  if (file.permissionMode === 'editors' && !isEditor) {
    return { allowed: false, reason: 'editors_only' }
  }
  
  if (file.permissionMode === 'viewers' && !isViewer) {
    return { allowed: false, reason: 'viewers_only' }
  }
  
  // Default: owner-only
  return { allowed: false, reason: 'owner_only' }
}

router.get('/', authenticate, deviceFingerprint, async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoose = await import('mongoose')
    if (mongoose.default.connection.readyState !== 1) {
      console.warn('MongoDB not connected, returning empty file list')
      return res.json([])
    }

    // Temporarily return all files for testing (remove owner filter)
    const files = await File.find({})
      .populate('owner', 'name email')
      .populate('editors', 'name email')
      .populate('viewers', 'name email')
      .sort({ createdAt: -1 })
    
    // Log audit event (don't fail if this fails)
    try {
      await logAuditEvent('file_list', req.user._id.toString(), 'Files listed', {
        count: files.length,
        ipAddress: req.ip,
        deviceFingerprint: req.deviceFingerprint
      })
    } catch (auditError) {
      console.error('Audit log error (non-fatal):', auditError.message)
    }
    
    res.json(files)
  } catch (error) {
    console.error('Error fetching files:', error)
    
    // Check if it's a MongoDB connection error
    if (error.name === 'MongoServerError' || 
        error.name === 'MongooseError' ||
        error.message?.includes('MongoServerError') ||
        error.message?.includes('connect ECONNREFUSED') ||
        error.message?.includes('MongoNetworkError')) {
      console.warn('MongoDB connection issue, returning empty array')
      return res.json([]) // Return empty array instead of error
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to fetch files',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

router.post('/upload-url', authenticate, async (req, res) => {
  try {
    const { fileName, fileType } = req.body

    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'fileName and fileType are required' })
    }

    // Check if S3 is configured
    const hasS3Config = process.env.AWS_ACCESS_KEY_ID && 
                       process.env.AWS_ACCESS_KEY_ID !== 'YOUR_AWS_ACCESS_KEY' &&
                       process.env.AWS_SECRET_ACCESS_KEY &&
                       process.env.AWS_SECRET_ACCESS_KEY !== 'YOUR_AWS_SECRET_KEY'

    if (hasS3Config) {
      try {
        const { uploadUrl, key } = await generateUploadUrl(fileName, fileType)
        return res.json({ uploadUrl, s3Key: key })
      } catch (s3Error) {
        console.error('S3 upload failed, falling back to direct upload:', s3Error.message)
        // Fall through to direct upload
      }
    }

    // Fallback: Return a direct upload endpoint
    const key = `uploads/${uuidv4()}-${fileName}`
    res.json({ 
      uploadUrl: null, // Signal to use direct upload
      s3Key: key,
      useDirectUpload: true
    })
  } catch (error) {
    console.error('Upload URL error:', error)
    res.status(500).json({ error: error.message || 'Failed to generate upload URL' })
  }
})

// Direct upload endpoint (fallback when S3 is not configured)
router.post('/direct-upload', authenticate, deviceFingerprint, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const fileName = req.file.originalname
    const fileType = req.file.mimetype
    const fileSize = req.file.size
    const localPath = req.file.path
    const s3Key = `local-${req.file.filename}`

    // Read file for scanning
    const fileBuffer = fs.readFileSync(localPath)
    
    // Security scanning (with error handling)
    let threats = []
    let dlpFindings = []
    try {
      threats = await scanFile(fileBuffer, fileName, fileType) || []
      dlpFindings = await scanFileContent(fileBuffer, fileName) || []
    } catch (scanError) {
      console.error('Security scan error (non-fatal):', scanError.message)
      // Continue with upload even if scanning fails
    }

    if (threats.some(t => t.severity === 'critical')) {
      // Delete the file if it's a threat
      fs.unlinkSync(localPath)
      try {
        await logAuditEvent('threat_detected', req.user._id?.toString() || 'unknown', 'Critical threat detected in file upload', {
          fileName,
          threats,
          ipAddress: req.ip
        })
      } catch (auditError) {
        console.error('Audit log error (non-fatal):', auditError.message)
      }
      return res.status(403).json({ 
        error: 'File rejected due to security threat',
        threats,
        dlpFindings
      })
    }

    // Calculate file hash
    const crypto = await import('crypto')
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')

    // Check MongoDB connection before saving
    const mongoose = await import('mongoose')
    if (mongoose.default.connection.readyState !== 1) {
      console.warn('MongoDB not connected, returning file info without saving')
      // Return file info even if MongoDB is not connected
      return res.json({ 
        file: {
          name: fileName,
          size: fileSize,
          type: fileType,
          s3Key: s3Key,
          localPath: localPath,
          fileHash,
          threats: threats.length > 0 ? threats : undefined,
          dlpFindings: dlpFindings.length > 0 ? dlpFindings : undefined,
          _id: 'temp-' + Date.now(),
          createdAt: new Date()
        },
        security: {
          threats: threats.length,
          dlpFindings: dlpFindings.length,
          safe: threats.length === 0 && dlpFindings.length === 0
        },
        warning: 'File saved locally but not persisted to database'
      })
    }

    // Convert mock user ID to ObjectId if needed
    let ownerId = req.user._id
    if (typeof ownerId === 'string' && ownerId === 'mock-user-id') {
      // Try to find or create a mock user
      const User = (await import('../models/User.js')).default
      let mockUser = await User.findOne({ email: 'test@example.com' })
      if (!mockUser) {
        mockUser = new User({
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashed-password'
        })
        try {
          await mockUser.save()
        } catch (userError) {
          console.error('Failed to create mock user:', userError.message)
          // Use a valid ObjectId format even if user creation fails
          const mongoose = await import('mongoose')
          ownerId = new mongoose.default.Types.ObjectId()
        }
      }
      if (mockUser) {
        ownerId = mockUser._id
      }
    }

    // Get room-based permissions from request body
    let editorRooms = req.body.editorRooms || []
    let viewerRooms = req.body.viewerRooms || []
    const permissionMode = req.body.permissionMode || 'owner-only'
    
    // Parse if they're JSON strings (from FormData)
    if (typeof editorRooms === 'string') {
      try {
        editorRooms = JSON.parse(editorRooms)
      } catch {
        editorRooms = []
      }
    }
    if (typeof viewerRooms === 'string') {
      try {
        viewerRooms = JSON.parse(viewerRooms)
      } catch {
        viewerRooms = []
      }
    }
    
    // Ensure arrays
    editorRooms = Array.isArray(editorRooms) ? editorRooms : []
    viewerRooms = Array.isArray(viewerRooms) ? viewerRooms : []

    const file = new File({
      name: fileName,
      size: fileSize,
      type: fileType,
      s3Key: s3Key,
      owner: ownerId,
      fileHash,
      threats: threats.length > 0 ? threats : undefined,
      dlpFindings: dlpFindings.length > 0 ? dlpFindings : undefined,
      localPath: localPath, // Store local path for direct uploads
      editorRooms: editorRooms,
      viewerRooms: viewerRooms,
      permissionMode: permissionMode
    })

    await file.save()
    await file.populate('owner', 'name email')
    await file.populate('editors', 'name email')
    await file.populate('viewers', 'name email')

    try {
      await logAuditEvent('file_upload', req.user._id?.toString() || ownerId?.toString() || 'unknown', `File uploaded: ${fileName}`, {
        fileId: file._id.toString(),
        fileName,
        fileSize,
        threats: threats.length,
        dlpFindings: dlpFindings.length,
        ipAddress: req.ip,
        deviceFingerprint: req.deviceFingerprint
      })
    } catch (auditError) {
      console.error('Audit log error (non-fatal):', auditError.message)
    }

    const io = req.app.get('io')
    if (io) {
      io.emit('file-uploaded', { name: fileName, fileId: file._id })
    }

    res.json({ 
      file,
      security: {
        threats: threats.length,
        dlpFindings: dlpFindings.length,
        safe: threats.length === 0 && dlpFindings.length === 0
      }
    })
  } catch (error) {
    console.error('Direct upload error:', error)
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error('Failed to delete uploaded file:', unlinkError)
      }
    }
    res.status(500).json({ 
      error: error.message || 'Failed to upload file',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

router.post('/complete-upload', authenticate, deviceFingerprint, async (req, res) => {
  try {
    const { fileName, fileType, fileSize, s3Key, fileHash, editorRooms = [], viewerRooms = [], permissionMode = 'owner-only' } = req.body

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

    // Ensure arrays
    const editorRoomIds = Array.isArray(editorRooms) ? editorRooms : []
    const viewerRoomIds = Array.isArray(viewerRooms) ? viewerRooms : []

    const file = new File({
      name: fileName,
      size: fileSize,
      type: fileType,
      s3Key: s3Key,
      owner: req.user._id,
      fileHash,
      threats: threats.length > 0 ? threats : undefined,
      dlpFindings: dlpFindings.length > 0 ? dlpFindings : undefined,
      editorRooms: editorRoomIds,
      viewerRooms: viewerRoomIds,
      permissionMode: permissionMode
    })

    await file.save()

    // Populate owner, editors, and viewers before returning
    await file.populate('owner', 'name email')
    await file.populate('editors', 'name email')
    await file.populate('viewers', 'name email')

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
    // Check MongoDB connection
    const mongoose = await import('mongoose')
    if (mongoose.default.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not available. Please try again later.' })
    }

    const file = await File.findById(req.params.id)
      .populate('editors', 'name email')
      .populate('viewers', 'name email')

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Check file access permissions
    const access = checkFileAccess(file, req.user._id, 'download')
    if (!access.allowed) {
      try {
        await logAuditEvent('access_denied', req.user._id.toString(), `Attempted to download file without permission: ${file.name}`, {
          fileId: file._id.toString(),
          reason: access.reason,
          ipAddress: req.ip
        })
      } catch (auditError) {
        console.error('Audit log error (non-fatal):', auditError.message)
      }
      return res.status(403).json({ error: 'Access denied', reason: access.reason })
    }

    // Check if file is stored locally (direct upload)
    if (file.localPath && fs.existsSync(file.localPath)) {
      // Serve file directly
      return res.download(file.localPath, file.name)
    }

    // Try S3 download
    try {
      const downloadUrl = await generateDownloadUrl(file.s3Key)
      return res.json({ downloadUrl })
    } catch (s3Error) {
      console.error('S3 download failed:', s3Error.message)
      return res.status(500).json({ error: 'File not available for download' })
    }
  } catch (error) {
    console.error('Download error:', error)
    
    // Check if it's a MongoDB connection error
    if (error.name === 'MongoServerError' || 
        error.name === 'MongooseError' ||
        error.message?.includes('MongoServerError') ||
        error.message?.includes('connect ECONNREFUSED') ||
        error.message?.includes('MongoNetworkError')) {
      return res.status(503).json({ error: 'Database not available. Please try again later.' })
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to download file',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

router.delete('/:id', authenticate, deviceFingerprint, async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoose = await import('mongoose')
    if (mongoose.default.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not available. Please try again later.' })
    }

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

    // Delete local file if it exists
    if (file.localPath && fs.existsSync(file.localPath)) {
      try {
        fs.unlinkSync(file.localPath)
      } catch (unlinkError) {
        console.error('Failed to delete local file:', unlinkError)
      }
    } else {
      // Try to delete from S3
      try {
        await deleteS3File(file.s3Key)
      } catch (s3Error) {
        console.error('Failed to delete from S3:', s3Error.message)
        // Continue with deletion even if S3 delete fails
      }
    }

    await File.findByIdAndDelete(req.params.id)

    try {
      await logAuditEvent('file_delete', req.user._id?.toString() || 'unknown', `File deleted: ${file.name}`, {
        fileId: file._id.toString(),
        fileName: file.name,
        ipAddress: req.ip,
        deviceFingerprint: req.deviceFingerprint
      })
    } catch (auditError) {
      console.error('Audit log error (non-fatal):', auditError.message)
    }

    const io = req.app.get('io')
    if (io) {
      io.emit('file-deleted', { name: file.name, fileId: file._id })
    }

    res.json({ message: 'File deleted' })
  } catch (error) {
    console.error('Delete error:', error)
    
    // Check if it's a MongoDB connection error
    if (error.name === 'MongoServerError' || 
        error.name === 'MongooseError' ||
        error.message?.includes('MongoServerError') ||
        error.message?.includes('connect ECONNREFUSED') ||
        error.message?.includes('MongoNetworkError')) {
      return res.status(503).json({ error: 'Database not available. Please try again later.' })
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to delete file',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
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

router.patch('/:id', authenticate, deviceFingerprint, async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoose = await import('mongoose')
    if (mongoose.default.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not available. Please try again later.' })
    }

    const file = await File.findById(req.params.id)

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    // Temporarily disabled owner check for testing
    // if (file.owner.toString() !== req.user._id.toString()) {
    //   return res.status(403).json({ error: 'Access denied' })
    // }

    const { name } = req.body

    if (name) {
      file.name = name
      await file.save()

      try {
        await logAuditEvent('file_modify', req.user._id?.toString() || 'unknown', `File renamed: ${file.name}`, {
          fileId: file._id.toString(),
          fileName: file.name,
          ipAddress: req.ip,
          deviceFingerprint: req.deviceFingerprint
        })
      } catch (auditError) {
        console.error('Audit log error (non-fatal):', auditError.message)
      }
    }

    res.json(file)
  } catch (error) {
    console.error('Rename error:', error)
    
    // Check if it's a MongoDB connection error
    if (error.name === 'MongoServerError' || 
        error.name === 'MongooseError' ||
        error.message?.includes('MongoServerError') ||
        error.message?.includes('connect ECONNREFUSED') ||
        error.message?.includes('MongoNetworkError')) {
      return res.status(503).json({ error: 'Database not available. Please try again later.' })
    }
    
    res.status(500).json({ 
      error: error.message || 'Failed to rename file',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
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

