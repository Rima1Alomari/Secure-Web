import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import agoraRoutes from './routes/agora.js'
import fileRoutes from './routes/files.js'
import shareRoutes from './routes/share.js'
import securityRoutes from './routes/security.js'
import auditRoutes from './routes/audit.js'
import dataRightsRoutes from './routes/dataRights.js'
import aiRoutes from './routes/ai.js'
import chatRoutes from './routes/chat.js'
import roomRoutes from './routes/rooms.js'
import { initializeSecurityMiddleware } from './middleware/security.js'

dotenv.config()

// Log environment status
console.log('🔧 Environment Configuration:')
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
console.log(`   - PORT: ${process.env.PORT || 5000}`)
console.log(`   - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`)
console.log(`   - MONGODB_URI: ${process.env.MONGODB_URI ? '✅ Set' : '⚠️ Using default'}`)

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})

const PORT = process.env.PORT || 5001
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cybrany'

// Security Middleware - Relaxed for development
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  } : false, // Disable CSP in development
  crossOriginEmbedderPolicy: false
}))

// IMPORTANT: Bypass ALL middleware for auth routes FIRST in development
// This MUST be before any other middleware including rate limiter
if (process.env.NODE_ENV === 'development') {
  console.log('🔓 Development mode: Auth routes completely bypassed')
  // Bypass ALL middleware for auth routes - MUST be first, before rate limiter
  app.use('/api/auth', (req, res, next) => {
    console.log(`✅ Auth route bypassed: ${req.method} ${req.path} from ${req.ip}`)
    next()
  })
  app.use('/api/ai', (req, res, next) => {
    console.log(`✅ AI route bypassed: ${req.method} ${req.path}`)
    next()
  })
}

// Rate Limiting - More lenient for development, skip for AI and auth routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit in development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for AI and auth routes in development
    if (process.env.NODE_ENV === 'development') {
      const shouldSkip = req.path.startsWith('/api/ai') || req.path.startsWith('/api/auth')
      if (shouldSkip) {
        console.log(`⏭️ Rate limiter skipped for: ${req.path}`)
      }
      return shouldSkip
    }
    return false
  }
})
// Apply rate limiter - auth routes already bypassed above
app.use('/api/', limiter)

// CORS with strict origins - More permissive in development
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [process.env.CLIENT_URL || 'http://localhost:3000']
app.use(cors({
  origin: (origin, callback) => {
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true)
    }
    // In production, check allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.warn(`CORS blocked origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Add request logging for debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/ai') || req.path.startsWith('/api/auth') || req.path.startsWith('/api/chat')) {
    console.log(`📥 ${req.method} ${req.path} from ${req.ip}`)
  }
  next()
})

// Initialize Security Middleware (after body parsing, before routes)
// Skip security middleware completely in development
if (process.env.NODE_ENV === 'development') {
  console.log('⚠️ Development mode: All security middleware disabled')
  // Add a simple pass-through middleware for development
  // BUT skip it for auth routes (already bypassed above)
  app.use(async (req, res, next) => {
    // Skip security middleware for auth routes
    if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/ai')) {
      return next()
    }
    // Generate device fingerprint if needed by routes
    if (!req.deviceFingerprint) {
      const crypto = await import('crypto')
      const fingerprint = req.headers['user-agent'] + (req.ip || 'unknown')
      req.deviceFingerprint = crypto.createHash('sha256').update(fingerprint).digest('hex')
    }
    next()
  })
} else {
  initializeSecurityMiddleware(app)
}

// MongoDB connection with better error handling
mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  })
  .then(() => {
    console.log('✅ MongoDB connected successfully')
    console.log(`   Database: ${MONGODB_URI.split('/').pop()}`)
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message)
    console.error('   Please make sure MongoDB is running and accessible')
    console.error('   Connection string:', MONGODB_URI)
    // Don't exit - let the server start but log the error
  })

// Handle MongoDB connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err)
})

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected')
})

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected')
})

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token
  if (token) {
    next()
  } else {
    next(new Error('Authentication error'))
  }
})

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

// Make io available to routes
app.set('io', io)

// API Routes - Auth routes FIRST (most important)
app.use('/api/auth', authRoutes)
// AI routes
app.use('/api/ai', (req, res, next) => {
  // Log the request
  console.log(`🤖 AI Route: ${req.method} ${req.path} from ${req.ip || req.connection.remoteAddress}`)
  // Skip all security checks for AI routes in development
  next()
})
app.use('/api/ai', aiRoutes)
app.use('/api/agora', agoraRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/share', shareRoutes)
app.use('/api/security', securityRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/data-rights', dataRightsRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/rooms', roomRoutes)

// Serve static files from React app in development (proxy to Vite dev server)
if (process.env.NODE_ENV === 'development') {
  app.get('/', (req, res) => {
    res.redirect('http://localhost:3000')
  })
} else {
  // Serve static files from React build in production
  app.use(express.static(path.join(__dirname, '../client/dist')))
  
  // Serve React app for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'))
  })
}

httpServer.listen(PORT, () => {
  console.log(`Secure Web server running on port ${PORT}`)
  console.log(`High Security Mode: ${process.env.HIGH_SECURITY_MODE || 'enabled'}`)
})
