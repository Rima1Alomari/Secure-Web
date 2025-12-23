import express from 'express'
import OpenAI from 'openai'
import { authenticate } from '../middleware/auth.js'
import ChatMessage from '../models/ChatMessage.js'
import User from '../models/User.js'
import { logAuditEvent } from '../utils/audit.js'

const router = express.Router()

// Initialize OpenAI for chat features
// Use environment variable only - never hardcode API keys
const apiKey = process.env.OPENAI_API_KEY
let openai = null
try {
  if (apiKey) {
    openai = new OpenAI({ apiKey })
    console.log('✅ OpenAI initialized for chat features')
  }
} catch (error) {
  console.error('❌ Failed to initialize OpenAI for chat:', error)
}

// Get messages for a room
router.get('/room/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user._id

    const messages = await ChatMessage.find({ roomId })
      .populate({
        path: 'sender',
        select: 'name email',
        model: 'User'
      })
      .sort({ createdAt: 1 })
      .limit(100) // Get last 100 messages

    // Mark messages as read for the current user (if they are recipient)
    await ChatMessage.updateMany(
      {
        roomId,
        recipientId: userId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    )

    // Get unique sender IDs
    const senderIds = [...new Set(messages.map(msg => {
      if (msg.sender) {
        return typeof msg.sender === 'object' && msg.sender._id 
          ? msg.sender._id.toString() 
          : msg.sender.toString()
      }
      return null
    }).filter(Boolean))]

    // Fetch all senders at once
    const senders = await User.find({ _id: { $in: senderIds } }).select('name email')
    const senderMap = new Map(senders.map(u => [u._id.toString(), u.name]))

    // Map messages with sender names
    const messagesWithSenders = messages.map((msg) => {
      let senderName = 'Unknown'
      let senderId = null
      
      if (msg.sender) {
        if (typeof msg.sender === 'object' && msg.sender.name) {
          senderName = msg.sender.name
          senderId = msg.sender._id?.toString() || msg.sender.toString()
        } else {
          senderId = msg.sender.toString()
          senderName = senderMap.get(senderId) || 'Unknown'
        }
      }

      return {
        id: msg._id.toString(),
        sender: senderName,
        senderId: senderId || msg.sender?.toString(),
        message: msg.message,
        timestamp: msg.createdAt,
        isOwn: (senderId || msg.sender?.toString()) === userId.toString(),
        roomId: msg.roomId,
        read: msg.read
      }
    })

    res.json(messagesWithSenders)
  } catch (error) {
    console.error('❌ Error fetching room messages:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ 
      error: error.message || 'Failed to fetch messages',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Get direct messages between two users
router.get('/direct/:otherUserId', authenticate, async (req, res) => {
  try {
    const { otherUserId } = req.params
    const userId = req.user._id

    console.log(`📨 Fetching direct messages: current user ${userId}, other user ${otherUserId}`)

    // Convert to ObjectId if needed
    let otherUserObjectId
    try {
      const mongoose = await import('mongoose')
      otherUserObjectId = mongoose.default.Types.ObjectId.isValid(otherUserId) 
        ? new mongoose.default.Types.ObjectId(otherUserId)
        : otherUserId
    } catch {
      otherUserObjectId = otherUserId
    }

    // Find all messages between the two users (bidirectional)
    const messages = await ChatMessage.find({
      $or: [
        { sender: userId, recipientId: otherUserObjectId, roomId: { $exists: false } },
        { sender: otherUserObjectId, recipientId: userId, roomId: { $exists: false } }
      ]
    })
      .populate({
        path: 'sender',
        select: 'name email',
        model: 'User'
      })
      .sort({ createdAt: 1 })
      .limit(200) // Increased limit to get more messages

    // Mark messages as read (convert otherUserId to ObjectId if needed)
    let otherUserObjectIdForUpdate
    try {
      const mongoose = await import('mongoose')
      otherUserObjectIdForUpdate = mongoose.default.Types.ObjectId.isValid(otherUserId)
        ? new mongoose.default.Types.ObjectId(otherUserId)
        : otherUserId
    } catch {
      otherUserObjectIdForUpdate = otherUserId
    }

    await ChatMessage.updateMany(
      {
        sender: otherUserObjectIdForUpdate,
        recipientId: userId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    )

    // Get unique sender IDs (handle both populated and non-populated senders)
    const senderIds = [...new Set(messages.map(msg => {
      if (!msg.sender) return null
      
      // If sender is populated (object with _id)
      if (typeof msg.sender === 'object' && msg.sender._id) {
        return msg.sender._id.toString()
      }
      // If sender is just an ObjectId
      return msg.sender.toString()
    }).filter(Boolean))]

    console.log(`📋 Found ${senderIds.length} unique senders:`, senderIds)

    // Fetch all senders at once - convert to ObjectIds for query
    const mongoose = await import('mongoose')
    const senderObjectIds = senderIds.map(id => {
      try {
        return mongoose.default.Types.ObjectId.isValid(id) 
          ? new mongoose.default.Types.ObjectId(id)
          : id
      } catch {
        return id
      }
    })

    const senders = await User.find({ _id: { $in: senderObjectIds } }).select('name email _id')
    console.log(`✅ Fetched ${senders.length} users from database`)
    
    // Create a comprehensive map: support both string and ObjectId keys
    const senderMap = new Map()
    senders.forEach(u => {
      const idStr = u._id.toString()
      senderMap.set(idStr, u.name)
      // Also add the ObjectId itself as key (in case of type mismatch)
      senderMap.set(u._id, u.name)
    })

    // Find any missing sender IDs that weren't found in the initial query
    const missingSenderIds = senderIds.filter(id => {
      const idStr = id.toString()
      return !senderMap.has(idStr) && !senders.some(s => s._id.toString() === idStr)
    })

    // Fetch missing senders if any
    if (missingSenderIds.length > 0) {
      console.log(`🔍 Fetching ${missingSenderIds.length} missing senders...`)
      try {
        const missingObjectIds = missingSenderIds.map(id => {
          try {
            return mongoose.default.Types.ObjectId.isValid(id) 
              ? new mongoose.default.Types.ObjectId(id)
              : id
          } catch {
            return id
          }
        })
        const missingSenders = await User.find({ _id: { $in: missingObjectIds } }).select('name email _id')
        missingSenders.forEach(u => {
          const idStr = u._id.toString()
          senderMap.set(idStr, u.name)
          senderMap.set(u._id, u.name)
        })
        senders.push(...missingSenders)
        console.log(`✅ Fetched ${missingSenders.length} additional senders`)
      } catch (missingError) {
        console.error('⚠️ Error fetching missing senders:', missingError)
      }
    }

    // Map messages with sender names
    const messagesWithSenders = messages.map((msg) => {
      let senderName = 'Unknown'
      let senderId = null
      
      if (msg.sender) {
        // Case 1: Sender is populated (object with name and _id)
        if (typeof msg.sender === 'object' && msg.sender.name) {
          senderName = msg.sender.name
          senderId = msg.sender._id?.toString() || msg.sender.toString()
        } 
        // Case 2: Sender is populated but name is missing (fallback to lookup)
        else if (typeof msg.sender === 'object' && msg.sender._id) {
          senderId = msg.sender._id.toString()
          senderName = senderMap.get(senderId) || senderMap.get(msg.sender._id) || 'Unknown'
          
          // Try to find in senders array if not in map
          if (senderName === 'Unknown') {
            const foundSender = senders.find(s => s._id.toString() === senderId)
            if (foundSender) {
              senderName = foundSender.name
            }
          }
        }
        // Case 3: Sender is just an ObjectId (string or ObjectId)
        else {
          senderId = msg.sender.toString()
          senderName = senderMap.get(senderId) || 'Unknown'
          
          // Try to find in senders array if not in map
          if (senderName === 'Unknown') {
            const foundSender = senders.find(s => s._id.toString() === senderId)
            if (foundSender) {
              senderName = foundSender.name
            }
          }
        }
      }

      // Log if still Unknown for debugging
      if (senderName === 'Unknown' && senderId) {
        console.warn(`⚠️ Could not find sender name for ID: ${senderId}`)
      }

      return {
        id: msg._id.toString(),
        sender: senderName,
        senderId: senderId || msg.sender?.toString(),
        message: msg.message,
        timestamp: msg.createdAt,
        isOwn: (senderId || msg.sender?.toString()) === userId.toString(),
        recipientId: msg.recipientId?.toString(),
        read: msg.read
      }
    })

    console.log(`✅ Fetched ${messagesWithSenders.length} direct messages`)
    res.json(messagesWithSenders)
  } catch (error) {
    console.error('❌ Error fetching direct messages:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ 
      error: error.message || 'Failed to fetch messages',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Send a message
router.post('/send', authenticate, async (req, res) => {
  try {
    const { message, roomId, recipientId } = req.body
    const userId = req.user._id

    if (!message || (!roomId && !recipientId)) {
      return res.status(400).json({ error: 'Message and roomId or recipientId are required' })
    }

    // Convert recipientId to ObjectId if needed
    let recipientObjectId = undefined
    if (recipientId) {
      try {
        const mongoose = await import('mongoose')
        recipientObjectId = mongoose.default.Types.ObjectId.isValid(recipientId)
          ? new mongoose.default.Types.ObjectId(recipientId)
          : recipientId
        console.log(`📤 Preparing to send message: from ${userId} to ${recipientObjectId}`)
      } catch {
        recipientObjectId = recipientId
      }
    }

    const chatMessage = new ChatMessage({
      sender: userId,
      message: message.trim(),
      roomId: roomId || undefined,
      recipientId: recipientObjectId || undefined,
      read: false
    })

    try {
      await chatMessage.save()
      console.log(`✅ Chat message saved: ${chatMessage._id} from user ${userId}`)
    } catch (saveError) {
      console.error('❌ Error saving chat message:', saveError)
      return res.status(500).json({ 
        error: 'Failed to save message',
        details: process.env.NODE_ENV === 'development' ? saveError.message : undefined
      })
    }
    
    // Get sender information - ensure we always have a name
    let senderName = 'Unknown'
    try {
      const senderUser = await User.findById(userId).select('name email')
      if (senderUser && senderUser.name) {
        senderName = senderUser.name
        console.log(`✅ Found sender name: ${senderName} for user ${userId}`)
      } else {
        console.warn(`⚠️ User not found or has no name for ID: ${userId}`)
        // Try to get from req.user if available
        if (req.user && req.user.name) {
          senderName = req.user.name
        }
      }
    } catch (userError) {
      console.error('⚠️ Error fetching sender user:', userError)
      // Try to get from req.user if available
      if (req.user && req.user.name) {
        senderName = req.user.name
      }
    }

    // Log audit event (non-fatal)
    try {
      await logAuditEvent('message_send', userId.toString(), 
        `Sent message in ${roomId ? `room ${roomId}` : `direct chat with ${recipientId}`}`, {
        messageId: chatMessage._id.toString(),
        roomId,
        recipientId
      })
    } catch (auditError) {
      console.error('⚠️ Audit log error (non-fatal):', auditError.message)
      // Continue even if audit logging fails
    }

    const responseData = {
      id: chatMessage._id.toString(),
      sender: senderName,
      senderId: userId.toString(),
      message: chatMessage.message,
      timestamp: chatMessage.createdAt,
      isOwn: true,
      roomId: chatMessage.roomId,
      recipientId: chatMessage.recipientId?.toString(),
      read: false
    }
    
    console.log(`✅ Message sent successfully:`, {
      id: responseData.id,
      sender: responseData.sender,
      senderId: responseData.senderId,
      recipientId: responseData.recipientId,
      roomId: responseData.roomId,
      message: responseData.message.substring(0, 50)
    })

    res.json(responseData)
  } catch (error) {
    console.error('Error sending message:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get unread message count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const userId = req.user._id

    const unreadCount = await ChatMessage.countDocuments({
      recipientId: userId,
      read: false
    })

    res.json({ unreadCount })
  } catch (error) {
    console.error('Error getting unread count:', error)
    res.status(500).json({ error: error.message })
  }
})

// Mark messages as read
router.post('/mark-read', authenticate, async (req, res) => {
  try {
    const { roomId, otherUserId } = req.body
    const userId = req.user._id

    let updateQuery = {}

    if (roomId) {
      updateQuery = {
        roomId,
        recipientId: userId,
        read: false
      }
    } else if (otherUserId) {
      updateQuery = {
        sender: otherUserId,
        recipientId: userId,
        read: false
      }
    } else {
      return res.status(400).json({ error: 'roomId or otherUserId is required' })
    }

    const result = await ChatMessage.updateMany(
      updateQuery,
      {
        read: true,
        readAt: new Date()
      }
    )

    res.json({ updated: result.modifiedCount })
  } catch (error) {
    console.error('Error marking messages as read:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get AI reply suggestions for a message
router.post('/ai-suggestions', authenticate, async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not available' })
    }

    const { message, context } = req.body
    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const prompt = `Based on this message: "${message}", suggest 3 short, professional reply options. 
Context: ${context || 'General conversation'}
Return only the 3 suggestions, each on a new line, without numbering.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 200
    })

    const suggestions = completion.choices[0].message.content
      .split('\n')
      .filter(line => line.trim())
      .slice(0, 3)
      .map(line => line.replace(/^[-•]\s*/, '').trim())

    res.json({ suggestions })
  } catch (error) {
    console.error('Error generating AI suggestions:', error)
    res.status(500).json({ error: 'Failed to generate suggestions' })
  }
})

// Translate message
router.post('/translate', authenticate, async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not available' })
    }

    const { message, targetLanguage = 'English' } = req.body
    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const prompt = `Translate the following message to ${targetLanguage}. Return only the translation, nothing else:
"${message}"`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300
    })

    res.json({ 
      original: message,
      translated: completion.choices[0].message.content.trim(),
      targetLanguage 
    })
  } catch (error) {
    console.error('Error translating message:', error)
    res.status(500).json({ error: 'Failed to translate message' })
  }
})

// Summarize conversation
router.post('/summarize', authenticate, async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not available' })
    }

    const { messages } = req.body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const conversation = messages
      .slice(-50) // Last 50 messages
      .map(msg => `${msg.sender}: ${msg.message}`)
      .join('\n')

    const prompt = `Summarize this conversation in 3-5 bullet points. Focus on key topics, decisions, and action items:

${conversation}

Provide a concise summary.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 300
    })

    res.json({ 
      summary: completion.choices[0].message.content.trim()
    })
  } catch (error) {
    console.error('Error summarizing conversation:', error)
    res.status(500).json({ error: 'Failed to summarize conversation' })
  }
})

// Delete all messages in a room (admin only)
router.delete('/room/:roomId', authenticate, async (req, res) => {
  try {
    const { roomId } = req.params
    const userId = req.user._id
    
    // Check if user is admin (use role from req.user if available, otherwise fetch from DB)
    if (req.user.role && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete conversations' })
    }
    
    // If role not in req.user, fetch from database
    const user = await User.findById(userId)
    if (!user) {
      console.error(`❌ User not found: ${userId}`)
      return res.status(404).json({ error: 'User not found' })
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete conversations' })
    }

    const result = await ChatMessage.deleteMany({ roomId })
    
    // Log audit event (non-fatal)
    try {
      await logAuditEvent('message_delete', userId.toString(), 
        `Deleted all messages in room ${roomId}`, {
        roomId,
        deletedCount: result.deletedCount
      })
    } catch (auditError) {
      console.error('⚠️ Audit log error (non-fatal):', auditError.message)
      // Continue even if audit logging fails
    }

    console.log(`✅ Deleted ${result.deletedCount} messages from room ${roomId}`)
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} messages`
    })
  } catch (error) {
    console.error('Error deleting room messages:', error)
    res.status(500).json({ error: error.message })
  }
})

// Delete all direct messages between two users (admin only)
router.delete('/direct/:otherUserId', authenticate, async (req, res) => {
  try {
    const { otherUserId } = req.params
    const userId = req.user._id
    
    console.log(`🗑️ Delete request: user ${userId} wants to delete conversation with ${otherUserId}`)
    
    // Check if user is admin (use role from req.user if available, otherwise fetch from DB)
    if (req.user.role && req.user.role !== 'admin') {
      console.warn(`⚠️ Unauthorized delete attempt: user ${userId} is not admin (role: ${req.user.role})`)
      return res.status(403).json({ error: 'Only admins can delete conversations' })
    }
    
    // If role not in req.user, fetch from database
    const currentUser = await User.findById(userId)
    if (!currentUser) {
      console.error(`❌ User not found: ${userId}`)
      return res.status(404).json({ error: 'User not found' })
    }
    
    if (currentUser.role !== 'admin') {
      console.warn(`⚠️ Unauthorized delete attempt: user ${userId} is not admin (role: ${currentUser.role})`)
      return res.status(403).json({ error: 'Only admins can delete conversations' })
    }

    // Convert to ObjectId if needed
    let otherUserObjectId
    try {
      const mongoose = await import('mongoose')
      if (mongoose.default.Types.ObjectId.isValid(otherUserId)) {
        otherUserObjectId = new mongoose.default.Types.ObjectId(otherUserId)
      } else {
        console.error(`❌ Invalid ObjectId format: ${otherUserId}`)
        return res.status(400).json({ error: 'Invalid user ID format' })
      }
    } catch (error) {
      console.error('❌ Error converting ObjectId:', error)
      return res.status(400).json({ error: 'Invalid user ID format' })
    }

    console.log(`🔍 Searching for messages between ${userId} and ${otherUserObjectId}`)
    
    const result = await ChatMessage.deleteMany({
      $or: [
        { sender: userId, recipientId: otherUserObjectId, roomId: { $exists: false } },
        { sender: otherUserObjectId, recipientId: userId, roomId: { $exists: false } }
      ]
    })
    
    console.log(`✅ Found and deleted ${result.deletedCount} messages`)
    
    // Log audit event (non-fatal)
    try {
      await logAuditEvent('message_delete', userId.toString(), 
        `Deleted all direct messages with user ${otherUserId}`, {
        otherUserId,
        deletedCount: result.deletedCount
      })
    } catch (auditError) {
      console.error('⚠️ Audit log error (non-fatal):', auditError.message)
      // Continue even if audit logging fails
    }

    console.log(`✅ Deleted ${result.deletedCount} direct messages between ${userId} and ${otherUserId}`)
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} messages`
    })
  } catch (error) {
    console.error('❌ Error deleting direct messages:', error)
    res.status(500).json({ 
      error: error.message || 'Failed to delete messages',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

export default router

