# Secure Web - Unified Platform

A comprehensive web platform combining video conferencing (Agora) and file sharing (FileCloud) features in one application.

## Features

### Video Conferencing
- ✅ Real-time video and audio communication
- ✅ Screen sharing
- ✅ Mute/unmute controls
- ✅ Camera on/off toggle
- ✅ Dynamic grid layout for multiple participants

### File Management
- ✅ User authentication (Register/Login with JWT)
- ✅ File upload with drag & drop
- ✅ Direct S3 upload with presigned URLs
- ✅ File management (list, download, delete)
- ✅ Share files with password protection
- ✅ Real-time notifications via Socket.io
- ✅ Collaborative editing with OnlyOffice (config ready)

## Quick Start

### Option 1: Using the start script (Recommended)
```bash
./start.sh
```

### Option 2: Manual start
```bash
# Install all dependencies
npm run install-all

# Start both server and client
npm run dev
```

The application will be available at:
**http://localhost:3000**

## Setup Instructions

### 1. Configure Environment Variables

Create a `.env` file in the `server` directory:

```env
# Server
PORT=5000
CLIENT_URL=http://localhost:5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/secureweb

# JWT
JWT_SECRET=your-secret-key-here

# Agora (Get from https://console.agora.io/)
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# AWS S3
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# OnlyOffice (optional)
DOCUMENT_SERVER_URL=http://localhost:8080
API_URL=http://localhost:5000
```

### 2. Start MongoDB

Make sure MongoDB is running:
```bash
mongod
```

Or use MongoDB Atlas connection string in `MONGODB_URI`

### 3. Run the Application

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend client on `http://localhost:3000` (proxies API calls to backend)

**Access the application at: http://localhost:3000**

## How It Works

- **Development**: Frontend runs on port 3000, backend on port 5000. Frontend proxies API calls to backend.
- **Production**: Build the frontend and serve it from the backend on a single port.

## Usage

1. **Register/Login**: Create an account or sign in
2. **Dashboard**: Access both video conferencing and file management
3. **Video Conferencing**: Enter channel name and join video room
4. **File Management**: Upload, manage, and share files
5. **Share Files**: Generate share links with optional password protection

## Project Structure

```
Secure Web/
├── client/              # React + TypeScript + TailwindCSS frontend
│   ├── src/
│   │   ├── pages/      # Dashboard, VideoRoom, FileManager, etc.
│   │   └── utils/       # Auth utilities
├── server/              # Node.js + Express backend
│   ├── models/         # MongoDB models
│   ├── routes/         # API routes
│   ├── middleware/     # Auth middleware
│   └── config/         # S3 configuration
├── start.sh            # Quick start script
└── package.json        # Root package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user

### Agora (Video)
- `GET /api/agora/token?channelName=:name` - Get Agora token

### Files
- `GET /api/files` - Get user's files
- `POST /api/files/upload-url` - Get presigned upload URL
- `POST /api/files/complete-upload` - Complete upload
- `GET /api/files/:id/download-url` - Get download URL
- `DELETE /api/files/:id` - Delete file
- `POST /api/files/:id/share` - Share file
- `GET /api/files/:id/editor-config` - Get editor config

### Share
- `GET /api/share/:token` - Get shared file info
- `POST /api/share/:token/verify` - Verify password and get download URL

## Technologies

- **Frontend**: Vite + React + TypeScript + TailwindCSS
- **Backend**: Node.js + Express + MongoDB
- **Video**: Agora RTC SDK
- **Storage**: AWS S3
- **Real-time**: Socket.io
- **Editing**: OnlyOffice Document Server
- **Auth**: JWT

## Requirements

- Node.js (v16+)
- MongoDB
- AWS S3 account (for file storage)
- Agora account (for video conferencing)

## Production Deployment

```bash
# Build frontend
cd client && npm run build

# Start production server
cd .. && npm start
```

In production, the backend will serve the built frontend files on a single port.

## License

MIT
