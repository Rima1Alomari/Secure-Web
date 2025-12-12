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
  }]
}, {
  timestamps: true
})

export default mongoose.model('File', fileSchema)

