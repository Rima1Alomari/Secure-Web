import mongoose from 'mongoose'

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  s3Key: {
    type: String,
    required: true
  },
  localPath: {
    type: String,
    required: false
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileHash: String,
  threats: [{
    type: { type: String },
    severity: String,
    message: String
  }],
  dlpFindings: [{
    type: { type: String },
    category: String,
    severity: String,
    message: String
  }],
  // File access permissions - Room-based
  editorRooms: [{
    type: String, // Room IDs
    required: false
  }],
  viewerRooms: [{
    type: String, // Room IDs
    required: false
  }],
  // Legacy support for user-based permissions
  editors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  viewers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Permission mode: 'owner-only', 'rooms', 'public'
  permissionMode: {
    type: String,
    enum: ['owner-only', 'rooms', 'public'],
    default: 'owner-only'
  }
}, {
  timestamps: true
})

export default mongoose.model('File', fileSchema)

