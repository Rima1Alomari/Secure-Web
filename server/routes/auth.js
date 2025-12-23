import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import SecuritySettings from '../models/SecuritySettings.js'
import { logAuditEvent } from '../utils/audit.js'
import { deviceFingerprint } from '../middleware/security.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h' // Short-lived tokens for zero-trust

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Validate role if provided
    const validRoles = ['user', 'admin']
    const userRole = role && validRoles.includes(role) ? role : 'user'

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const user = new User({ name, email, password, role: userRole })
    await user.save()

    // Create security settings
    const securitySettings = new SecuritySettings({ 
      user: user._id,
      quantumProofMode: process.env.HIGH_SECURITY_MODE !== 'false'
    })
    await securitySettings.save()

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRY })

    // Generate device fingerprint if not already set
    let deviceFingerprint = req.deviceFingerprint
    if (!deviceFingerprint) {
      const crypto = await import('crypto')
      const fingerprint = req.headers['user-agent'] + req.ip
      deviceFingerprint = crypto.createHash('sha256').update(fingerprint).digest('hex')
    }

    await logAuditEvent('register', user._id.toString(), 'User registered', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: deviceFingerprint
    })

    res.json({ token, user: { id: user._id, userId: user.userId, name: user.name, email: user.email, role: user.role || 'user' } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/login', async (req, res) => {
  console.log('🔐 Login attempt:', { email: req.body.email, ip: req.ip })
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      await logAuditEvent('access_denied', 'unknown', 'Failed login attempt - user not found', {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      })
      return res.status(401).json({ 
        error: 'Account not found. Please create a new account.',
        error_ar: 'الحساب غير موجود. يرجى إنشاء حساب جديد.',
        accountNotFound: true
      })
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      await logAuditEvent('access_denied', user._id.toString(), 'Failed login attempt - invalid password', {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      })
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate userId if it doesn't exist (for existing users)
    if (!user.userId) {
      const rolePrefix = {
        'admin': 'AD',
        'user': 'US'
      }[user.role] || 'US'
      
      try {
        const lastUser = await User.findOne(
          { userId: new RegExp(`^#${rolePrefix}`) },
          { userId: 1 }
        ).sort({ userId: -1 }).exec()
        
        let nextNumber = 1
        if (lastUser && lastUser.userId) {
          const match = lastUser.userId.match(/#\w{2}(\d+)/)
          if (match) {
            nextNumber = parseInt(match[1], 10) + 1
          }
        }
        
        user.userId = `#${rolePrefix}${String(nextNumber).padStart(3, '0')}`
        await user.save()
      } catch (error) {
        console.error('Error generating userId on login:', error)
      }
    }

    // MFA check removed - login with email and password only
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: JWT_EXPIRY })

    // Generate device fingerprint if not already set
    let deviceFingerprint = req.deviceFingerprint
    if (!deviceFingerprint) {
      const crypto = await import('crypto')
      const fingerprint = req.headers['user-agent'] + req.ip
      deviceFingerprint = crypto.createHash('sha256').update(fingerprint).digest('hex')
    }

    await logAuditEvent('login', user._id.toString(), 'User logged in', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: deviceFingerprint
    })

    res.json({ token, user: { id: user._id, userId: user.userId, name: user.name, email: user.email, role: user.role || 'user' } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get all users (for permission selection)
router.get('/users', authenticate, async (req, res) => {
  try {
    const mongoose = await import('mongoose')
    if (mongoose.default.connection.readyState !== 1) {
      return res.json([]) // Return empty array if MongoDB not connected
    }

    const users = await User.find({}).select('name email _id role userId').sort({ name: 1 })
    res.json(users.map(u => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      userId: u.userId,
      name: u.name,
      email: u.email,
      role: u.role || 'user'
    })))
  } catch (error) {
    console.error('Error fetching users:', error)
    res.json([]) // Return empty array on error
  }
})

// Search users by email (for chat and other features)
router.get('/users/search', authenticate, async (req, res) => {
  try {
    const { email, query } = req.query
    const mongoose = await import('mongoose')
    if (mongoose.default.connection.readyState !== 1) {
      return res.json([]) // Return empty array if MongoDB not connected
    }

    let searchQuery = {}
    
    // If email is provided, search by exact email match
    if (email) {
      searchQuery = { email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } }
    } 
    // If query is provided, search by email or name
    else if (query) {
      const searchTerm = query.trim()
      // Escape special regex characters
      const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      searchQuery = {
        $or: [
          { email: { $regex: new RegExp(escapedTerm, 'i') } },
          { name: { $regex: new RegExp(escapedTerm, 'i') } }
        ]
      }
    } else {
      return res.status(400).json({ error: 'Email or query parameter is required' })
    }

    const users = await User.find(searchQuery)
      .select('name email _id role userId')
      .limit(20)
      .sort({ name: 1 })
    
    res.json(users.map(u => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      userId: u.userId,
      name: u.name,
      email: u.email,
      role: u.role || 'user'
    })))
  } catch (error) {
    console.error('Error searching users:', error)
    res.status(500).json({ error: 'Failed to search users' })
  }
})

// Update profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update only the name (email cannot be changed)
    user.name = name.trim()
    await user.save()

    await logAuditEvent('profile_update', user._id.toString(), 'Profile updated successfully', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ 
      message: 'Profile updated successfully',
      user: {
        id: user._id.toString(),
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Update security settings
router.put('/security-settings', authenticate, async (req, res) => {
  try {
    const { emailNotifications, loginAlerts, twoFactorEnabled } = req.body

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update security settings (you can store these in user model or separate collection)
    // For now, we'll just log the update
    await logAuditEvent('security_settings_update', user._id.toString(), 'Security settings updated', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      settings: {
        emailNotifications,
        loginAlerts,
        twoFactorEnabled
      }
    })

    res.json({ 
      message: 'Security settings updated successfully',
      settings: {
        emailNotifications: emailNotifications !== undefined ? emailNotifications : true,
        loginAlerts: loginAlerts !== undefined ? loginAlerts : true,
        twoFactorEnabled: twoFactorEnabled !== undefined ? twoFactorEnabled : false
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Change password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' })
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const isMatch = await user.comparePassword(currentPassword)
    if (!isMatch) {
      await logAuditEvent('password_change_failed', user._id.toString(), 'Failed password change - incorrect current password', {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      })
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    user.password = newPassword
    await user.save()

    await logAuditEvent('password_change', user._id.toString(), 'Password changed successfully', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Admin: Create user (admin only)
router.post('/admin/users', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const adminUser = await User.findById(req.user._id)
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { name, email, password, role } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    // Validate role if provided
    const validRoles = ['user', 'admin']
    const userRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'user'

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' })
    }

    const user = new User({ name, email, password, role: userRole })
    await user.save()

    await logAuditEvent('user_created', adminUser._id.toString(), `User ${name} created by admin`, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      createdUserId: user._id.toString()
    })

    res.json({
      message: 'User created successfully',
      user: {
        id: user._id.toString(),
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Admin: Update user (admin only)
router.put('/admin/users/:id', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const adminUser = await User.findById(req.user._id)
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const { name, email, role } = req.body
    const userId = req.params.id

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Update fields
    if (name) user.name = name.trim()
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email, _id: { $ne: userId } })
      if (existingUser) {
        return res.status(400).json({ error: 'Email is already taken by another user' })
      }
      user.email = email.trim()
    }
    if (role && ['user', 'admin'].includes(role.toLowerCase())) {
      user.role = role.toLowerCase()
    }

    await user.save()

    await logAuditEvent('user_updated', adminUser._id.toString(), `User ${user.name} updated by admin`, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      updatedUserId: user._id.toString()
    })

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id.toString(),
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role || 'user'
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Admin: Delete user (admin only)
router.delete('/admin/users/:id', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    const adminUser = await User.findById(req.user._id)
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' })
    }

    const userId = req.params.id

    // Prevent deleting yourself
    if (userId === adminUser._id.toString()) {
      return res.status(400).json({ error: 'You cannot delete your own account' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userName = user.name
    await User.findByIdAndDelete(userId)

    await logAuditEvent('user_deleted', adminUser._id.toString(), `User ${userName} deleted by admin`, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deletedUserId: userId
    })

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Endpoint to assign userIds to existing users (one-time migration)
router.post('/assign-user-ids', authenticate, async (req, res) => {
  try {
    const mongoose = await import('mongoose')
    if (mongoose.default.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not connected' })
    }

    const usersWithoutId = await User.find({ $or: [{ userId: { $exists: false } }, { userId: null }] })
    let updatedCount = 0

    for (const user of usersWithoutId) {
      const rolePrefix = {
        'admin': 'AD',
        'user': 'US'
      }[user.role] || 'US'

      const lastUser = await User.findOne(
        { userId: new RegExp(`^#${rolePrefix}`) },
        { userId: 1 }
      ).sort({ userId: -1 }).exec()

      let nextNumber = 1
      if (lastUser && lastUser.userId) {
        const match = lastUser.userId.match(/#\w{2}(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1
        }
      }

      user.userId = `#${rolePrefix}${String(nextNumber).padStart(3, '0')}`
      await user.save()
      updatedCount++
    }

    res.json({ message: `Assigned userIds to ${updatedCount} users`, updatedCount })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router

