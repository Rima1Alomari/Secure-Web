import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'register',
      'file_upload',
      'file_download',
      'file_share',
      'file_delete',
      'room_join',
      'room_create',
      'room_leave',
      'message_send',
      'threat_detected',
      'dlp_violation',
      'access_denied',
      'mfa_enabled',
      'mfa_disabled',
      'settings_change'
    ]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  details: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: String,
  userAgent: String,
  deviceFingerprint: String,
  blockchainHash: String, // Store blockchain transaction hash if logged
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
})

// Index for efficient queries
auditLogSchema.index({ userId: 1, timestamp: -1 })
auditLogSchema.index({ eventType: 1, timestamp: -1 })

export default mongoose.model('AuditLog', auditLogSchema)


