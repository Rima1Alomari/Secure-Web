import rateLimit from 'express-rate-limit'
import { body, validationResult } from 'express-validator'
import { isSaudiIP } from '../utils/ksaCompliance.js'
import crypto from 'crypto'

// Threat detection store (in-memory, should be Redis in production)
const threatStore = new Map()
const suspiciousActivityStore = new Map()

// Device fingerprinting (simplified)
export const deviceFingerprint = (req, res, next) => {
  const fingerprint = req.headers['user-agent'] + req.ip
  req.deviceFingerprint = crypto.createHash('sha256').update(fingerprint).digest('hex')
  next()
}

// KSA IP whitelist middleware
export const ksaIPWhitelist = (req, res, next) => {
  // Skip KSA IP check in development mode
  if (process.env.NODE_ENV === 'development') {
    return next()
  }
  
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

// Advanced threat detection middleware
export const advancedThreatDetection = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    return next()
  }

  const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]
  const userAgent = req.headers['user-agent'] || ''
  const timestamp = Date.now()

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /sql.*injection/i,
    /xss|script|javascript/i,
    /union.*select/i,
    /\.\.\/|\.\.\\|directory.*traversal/i,
    /eval\(|exec\(|system\(/i
  ]

  const requestBody = JSON.stringify(req.body || {})
  const requestQuery = JSON.stringify(req.query || {})
  const requestPath = req.path || ''

  // Check request for suspicious patterns
  const allRequestData = requestBody + requestQuery + requestPath
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(allRequestData)) {
      // Log threat
      const threatId = crypto.createHash('sha256').update(`${clientIP}-${timestamp}`).digest('hex')
      threatStore.set(threatId, {
        type: 'suspicious_pattern',
        ip: clientIP,
        path: requestPath,
        pattern: pattern.toString(),
        timestamp,
        userAgent
      })

      return res.status(403).json({
        error: 'Suspicious activity detected',
        message: 'Your request has been flagged for security review.'
      })
    }
  }

  // Rate-based threat detection
  const ipKey = `ip:${clientIP}`
  const ipActivity = suspiciousActivityStore.get(ipKey) || { count: 0, firstSeen: timestamp }
  
  // Reset if more than 1 hour has passed
  if (timestamp - ipActivity.firstSeen > 3600000) {
    ipActivity.count = 0
    ipActivity.firstSeen = timestamp
  }

  ipActivity.count++
  suspiciousActivityStore.set(ipKey, ipActivity)

  // Block if too many requests from same IP
  if (ipActivity.count > 100) {
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later.'
    })
  }

  // Check for unusual user agent patterns
  if (userAgent.length < 10 || userAgent.length > 500) {
    const threatId = crypto.createHash('sha256').update(`${clientIP}-${timestamp}`).digest('hex')
    threatStore.set(threatId, {
      type: 'suspicious_user_agent',
      ip: clientIP,
      userAgent,
      timestamp
    })
  }

  next()
}

// Session security middleware
export const sessionSecurity = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    return next()
  }

  // Check for session hijacking indicators
  const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId
  if (sessionId) {
    const sessionKey = `session:${sessionId}`
    const sessionData = threatStore.get(sessionKey)
    
    if (sessionData) {
      const clientIP = req.ip || req.connection.remoteAddress
      // Check if session IP matches current IP
      if (sessionData.ip && sessionData.ip !== clientIP) {
        return res.status(403).json({
          error: 'Session security violation',
          message: 'Your session has been invalidated due to security concerns.'
        })
      }
    }
  }

  next()
}

// Content Security Policy headers
export const contentSecurityPolicy = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://api.openai.com;"
    )
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  }
  next()
}

// Get threat statistics (for admin dashboard)
export const getThreatStatistics = () => {
  const threats = Array.from(threatStore.values())
  const last24Hours = Date.now() - (24 * 60 * 60 * 1000)
  
  return {
    total: threats.length,
    last24Hours: threats.filter(t => t.timestamp > last24Hours).length,
    byType: threats.reduce((acc, threat) => {
      acc[threat.type] = (acc[threat.type] || 0) + 1
      return acc
    }, {}),
    recent: threats
      .filter(t => t.timestamp > last24Hours)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10)
  }
}

// Initialize security middleware
export const initializeSecurityMiddleware = (app) => {
  // Apply content security headers
  app.use(contentSecurityPolicy)
  
  // Skip device fingerprinting in development mode for all routes
  app.use((req, res, next) => {
    // Skip security middleware for auth and AI routes in development
    if (process.env.NODE_ENV === 'development') {
      // Skip all security checks in development mode
      return next()
    }
    // In production, only skip for AI routes
    if (req.path.startsWith('/api/ai')) {
      return next()
    }
    deviceFingerprint(req, res, next)
  })
  
  // Advanced threat detection (skip in development)
  if (process.env.NODE_ENV === 'production') {
    app.use(advancedThreatDetection)
    app.use(sessionSecurity)
  }
  
  app.use(secureErrorHandler)
}

