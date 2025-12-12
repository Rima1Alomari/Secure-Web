# Environment Setup

## Required Environment Variables

Create a `.env` file in the `server/` directory with the following variables:

```env
# OpenAI API Key
OPENAI_API_KEY=your-openai-api-key-here

# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/secure-web

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# AWS S3 Configuration (for file storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=me-south-1
AWS_S3_BUCKET=secure-web-files

# Agora Configuration
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-app-certificate

# Security
HIGH_SECURITY_MODE=enabled
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Quick Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Create the `.env` file with the content above

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

Replace `your-openai-api-key-here` with your actual OpenAI API key from https://platform.openai.com/api-keys


