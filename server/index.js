import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import agoraRoutes from './routes/agora.js'
import fileRoutes from './routes/files.js'
import shareRoutes from './routes/share.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5000',
    methods: ['GET', 'POST']
  }
})

const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/secureweb'

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB connection
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err))

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

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/agora', agoraRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/share', shareRoutes)

// Serve static files from React app in development (proxy to Vite dev server)
if (process.env.NODE_ENV === 'development') {
  // In development, we'll proxy to Vite dev server
  // But we can also serve the built files if needed
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
})

