import mongoose from 'mongoose'

const chatMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    required: true
  },
  roomId: {
    type: String,
    required: false // For room chats
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // For direct chats
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
})

// Indexes for efficient queries
chatMessageSchema.index({ roomId: 1, createdAt: -1 })
chatMessageSchema.index({ sender: 1, recipientId: 1, createdAt: -1 })
chatMessageSchema.index({ recipientId: 1, read: 1 })

export default mongoose.model('ChatMessage', chatMessageSchema)


