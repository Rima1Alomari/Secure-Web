import rateLimit from 'express-rate-limit'
import { body, validationResult } from 'express-validator'
import { isSaudiIP } from '../utils/ksaCompliance.js'

// Device fingerprinting (simplified)
export const deviceFingerprint = (req, res, next) => {
  const fingerprint = req.headers['user-agent'] + req.ip
  req.deviceFingerprint = require('crypto').createHash('sha256').update(fingerprint).digest('hex')
  next()
}

// KSA IP whitelist middleware
export const ksaIPWhitelist = (req, res, next) => {
  // Skip KSA IP check for AI routes in development
  if (req.path.startsWith('/api/ai') && process.env.NODE_ENV === 'development') {
    return next()
  }
  
  if (process.env.KSA_HIGH_SECURITY_MODE === 'false' || !process.env.KSA_HIGH_SECURITY_MODE) {
    return next() // Skip if KSA mode disabled or not set
  }

  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]
  
  if (isSaudiIP(clientIP)) {
    next()
  } else {
    res.status(403).json({ 
      error: 'Access denied. KSA High Security Mode: Only Saudi IP addresses are allowed.',
      error_ar: 'تم رفض الوصول. وضع الأمان العالي السعودي: يُسمح فقط بعناوين IP السعودية.'
    })
  }
}

// IP Whitelisting middleware
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next() // No whitelist configured
    }
    
    const clientIP = req.ip || req.connection.remoteAddress
    if (allowedIPs.includes(clientIP)) {
      next()
    } else {
      res.status(403).json({ error: 'IP address not whitelisted' })
    }
  }
}

// Time-limited access middleware
export const timeLimitedAccess = (maxDurationMinutes = 60) => {
  return (req, res, next) => {
    req.sessionExpiry = Date.now() + (maxDurationMinutes * 60 * 1000)
    next()
  }
}

// Enhanced rate limiting for security endpoints
export const securityRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes
  message: 'Too many security requests, please try again later.'
})

// Input sanitization
export const sanitizeInput = [
  body('*').trim().escape(),
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid input detected' })
    }
    next()
  }
]

// Secure error handler
export const secureErrorHandler = (err, req, res, next) => {
  console.error('Error:', err)
  
  // Never leak sensitive information
  const isProduction = process.env.NODE_ENV === 'production'
  
  res.status(err.status || 500).json({
    error: isProduction ? 'An error occurred' : err.message,
    ...(isProduction ? {} : { stack: err.stack })
  })
}

// Initialize security middleware
export const initializeSecurityMiddleware = (app) => {
  // Skip device fingerprinting for AI routes in development
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/ai') && process.env.NODE_ENV === 'development') {
      return next() // Skip security middleware for AI routes
    }
    deviceFingerprint(req, res, next)
  })
  app.use(secureErrorHandler)
}

