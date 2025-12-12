# Secure Web - Advanced Secure Collaboration Platform

A unified secure collaboration platform with quantum-resistant encryption, AI-powered threat detection, zero-trust architecture, and full compliance with Saudi Arabia (KSA) cybersecurity regulations including SDAIA PDPL, SAMA CSCC, and Anti-Cyber Crime Law.

## Features

### 🔐 Quantum-Resistant End-to-End Encryption
- Post-quantum cryptography using libsodium
- Client-side encryption before upload
- Zero-knowledge proofs for file shares
- Toggleable quantum-proof mode

### 🤖 AI-Powered Threat Detection
- Real-time chat message scanning for phishing/malware
- File upload scanning with VirusTotal integration
- Behavioral anomaly detection
- TensorFlow.js for ML-based threat detection

### 🛡️ Data Loss Prevention (DLP)
- Automatic PII detection (emails, phones, SSNs, credit cards)
- Credential exposure detection
- Auto-redaction of sensitive content
- NLP-based name and address detection

### 🔒 Zero-Trust Architecture
- MFA support (WebAuthn preferred, TOTP fallback)
- Granular access controls (role-based, time-limited, IP whitelisting)
- Device fingerprinting
- Short-lived JWTs
- Session watermarking in video calls

### 📊 Compliance & Audit Logs
- Immutable blockchain-based audit logging (Ethereum testnet)
- GDPR-compliant log export (CSV/JSON)
- SIEM integration (Splunk/ELK compatible)
- Real-time security alerts

### 🎯 Unified Security Dashboard
- Encryption status monitoring
- Risk score calculation
- Compliance overview (GDPR)
- Threat alerts and recommendations
- Security scanning tools

## Tech Stack

### Frontend
- **Vite** + **React** + **TypeScript**
- **TailwindCSS** for styling
- **Agora RTC SDK** for video conferencing
- **TensorFlow.js** for client-side ML
- **libsodium-wrappers** for encryption
- **Socket.io Client** for real-time features

### Backend
- **Node.js** + **Express**
- **MongoDB** + **Mongoose**
- **AWS S3** for file storage
- **Socket.io** for real-time communication
- **Helmet.js** for security headers
- **express-rate-limit** for rate limiting
- **ethers.js** for blockchain integration

## Installation

### Prerequisites
- Node.js 18+
- MongoDB 6+
- AWS S3 account (for file storage)
- (Optional) Ethereum testnet access for blockchain audit logs
- (Optional) VirusTotal API key for threat intelligence

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Rima1Alomari/Secure-Web.git
   cd Secure-Web
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment variables**

   Create `.env` file in the root directory:
   ```env
   # Server
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:3000
   ALLOWED_ORIGINS=http://localhost:3000

   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/cybrany

   # JWT
   JWT_SECRET=your-super-secret-jwt-key-change-this
   JWT_EXPIRY=1h

   # AWS S3
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your-bucket-name

   # Security
   HIGH_SECURITY_MODE=true
   THREAT_INTELLIGENCE_ENABLED=true
   VIRUSTOTAL_API_KEY=your-virustotal-api-key

   # Blockchain (Optional - for immutable audit logs)
   BLOCKCHAIN_AUDIT_ENABLED=false
   BLOCKCHAIN_RPC=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   BLOCKCHAIN_PRIVATE_KEY=your-private-key
   AUDIT_CONTRACT_ADDRESS=your-contract-address

   # API
   API_URL=http://localhost:5000
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

   Or use the start script:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Security Configuration

### High Security Mode (Default)
High Security Mode is enabled by default. This includes:
- Quantum-resistant encryption
- Enhanced threat detection
- Strict rate limiting
- Comprehensive audit logging

To disable (not recommended for production):
```env
HIGH_SECURITY_MODE=false
```

### MFA Setup
1. Navigate to Security Center
2. Click "Enable MFA"
3. Scan QR code with authenticator app
4. Enter verification code

### IP Whitelisting
Configure IP whitelist in Security Settings:
```javascript
// In SecuritySettings model
ipWhitelist: ['192.168.1.100', '10.0.0.50']
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password (MFA if enabled)

### Security
- `GET /api/security/settings` - Get security settings
- `PUT /api/security/settings` - Update security settings
- `POST /api/security/scan/chat` - Scan chat message for threats
- `POST /api/security/scan/file` - Scan file for threats
- `POST /api/security/scan/room` - Scan current room for anomalies

### Audit
- `GET /api/audit/logs` - Get audit logs (with filters)
- `GET /api/audit/export` - Export audit logs (CSV/JSON)
- `GET /api/audit/siem` - SIEM-compatible export

### Files
- `GET /api/files` - List user files
- `POST /api/files/upload-url` - Get S3 upload URL
- `POST /api/files/complete-upload` - Complete upload (with security scan)
- `GET /api/files/:id/download-url` - Get download URL
- `DELETE /api/files/:id` - Delete file

### Video
- `GET /api/agora/token` - Get Agora RTC token

## Testing

Run security tests:
```bash
npm run test:security
```

Run all tests:
```bash
npm test
```

## Compliance

### GDPR
- Right to access: Export audit logs
- Right to erasure: Delete user data
- Data minimization: Only collect necessary data
- Encryption: All data encrypted at rest and in transit

## Deployment

### Production Checklist
- [ ] Set strong `JWT_SECRET`
- [ ] Configure MongoDB with authentication
- [ ] Set up AWS S3 with proper IAM roles
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS with specific origins
- [ ] Set up rate limiting
- [ ] Enable blockchain audit logging (optional)
- [ ] Configure VirusTotal API key
- [ ] Set up monitoring and alerting
- [ ] Review and update security settings

### Docker (Coming Soon)
```bash
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For security issues, please email: security@cybrany.com

## Acknowledgments

- Agora.io for video conferencing SDK
- libsodium for encryption
- TensorFlow.js for ML capabilities
- Ethereum for blockchain integration

---

**Secure Web** - Secure Collaboration for the Quantum Age
