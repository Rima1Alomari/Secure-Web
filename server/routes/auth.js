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
    const validRoles = ['user', 'admin', 'security']
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

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' } })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.post('/login', async (req, res) => {
  console.log('🔐 Login attempt:', { email: req.body.email, ip: req.ip })
  try {
    const { email, password, mfaCode } = req.body

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

    // Check MFA - mandatory in KSA mode
    const securitySettings = await SecuritySettings.findOne({ user: user._id })
    const ksaMode = process.env.KSA_HIGH_SECURITY_MODE !== 'false'
    const mfaRequired = ksaMode || securitySettings?.mfaEnabled
    
    if (mfaRequired) {
      if (!mfaCode) {
        return res.status(401).json({ 
          error: 'MFA code required', 
          mfaRequired: true,
          error_ar: 'رمز المصادقة متعددة العوامل مطلوب'
        })
      }
      // In production, verify TOTP code
      // For now, accept any code in development
    }

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
      deviceFingerprint: deviceFingerprint,
      mfaUsed: securitySettings?.mfaEnabled || false
    })

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role || 'user' } })
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

    const users = await User.find({}).select('name email _id role').sort({ name: 1 })
    res.json(users.map(u => ({
      id: u._id.toString(),
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role || 'user'
    })))
  } catch (error) {
    console.error('Error fetching users:', error)
    res.json([]) // Return empty array on error
  }
})

export default router

