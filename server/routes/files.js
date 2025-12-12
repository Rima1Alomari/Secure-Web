import express from 'express'
import { authenticate } from '../middleware/auth.js'
import File from '../models/File.js'
import { generateUploadUrl, generateDownloadUrl, deleteFile as deleteS3File } from '../config/s3.js'

const router = express.Router()

router.get('/', authenticate, async (req, res) => {
  try {
    const files = await File.find({ owner: req.user._id }).sort({ createdAt: -1 })
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

router.post('/complete-upload', authenticate, async (req, res) => {
  try {
    const { fileName, fileType, fileSize, s3Key } = req.body

    if (!fileName || !fileType || !fileSize || !s3Key) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    const file = new File({
      name: fileName,
      size: fileSize,
      type: fileType,
      s3Key: s3Key,
      owner: req.user._id
    })

    await file.save()

    const io = req.app.get('io')
    io.emit('file-uploaded', { name: fileName, fileId: file._id })

    res.json({ file })
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

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const downloadUrl = await generateDownloadUrl(file.s3Key)
    res.json({ downloadUrl })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const file = await File.findById(req.params.id)

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' })
    }

    await deleteS3File(file.s3Key)
    await File.findByIdAndDelete(req.params.id)

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

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' })
    }

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

const getDocumentType = (mimeType) => {
  if (mimeType.includes('word')) return 'word'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'cell'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'slide'
  return 'word'
}

export default router

