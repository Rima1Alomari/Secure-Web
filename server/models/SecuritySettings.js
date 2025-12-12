import mongoose from 'mongoose'

const securitySettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  quantumProofMode: {
    type: Boolean,
    default: process.env.HIGH_SECURITY_MODE !== 'false'
  },
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: String,
  mfaBackupCodes: [String],
  webauthnCredentials: [{
    credentialId: String,
    publicKey: String,
    counter: Number
  }],
  ipWhitelist: [String],
  deviceFingerprints: [String],
  lastSecurityScan: Date,
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
})

export default mongoose.model('SecuritySettings', securitySettingsSchema)


