import mongoose from 'mongoose'

const shareSchema = new mongoose.Schema({
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  }
}, {
  timestamps: true
})

export default mongoose.model('Share', shareSchema)

