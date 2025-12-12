import mongoose from 'mongoose'

const dataRightsRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['access', 'deletion', 'portability'],
    required: true
  },
  reason: String,
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected'],
    default: 'pending'
  },
  responseData: mongoose.Schema.Types.Mixed,
  completedAt: Date
}, {
  timestamps: true
})

export default mongoose.model('DataRightsRequest', dataRightsRequestSchema)


