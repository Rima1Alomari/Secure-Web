import { ethers } from 'ethers'
import AuditLog from '../models/AuditLog.js'

const BLOCKCHAIN_ENABLED = process.env.BLOCKCHAIN_AUDIT_ENABLED === 'true'
const BLOCKCHAIN_RPC = process.env.BLOCKCHAIN_RPC || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
const AUDIT_CONTRACT_ADDRESS = process.env.AUDIT_CONTRACT_ADDRESS || ''

// Simple ABI for audit logging
const AUDIT_ABI = [
  'function logEvent(string memory eventType, string memory userId, string memory details, uint256 timestamp) public'
]

let provider, contract, signer

// Initialize blockchain connection
export const initBlockchain = async () => {
  if (!BLOCKCHAIN_ENABLED) {
    return null
  }
  
  try {
    provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC)
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || ''
    
    if (privateKey && AUDIT_CONTRACT_ADDRESS) {
      signer = new ethers.Wallet(privateKey, provider)
      contract = new ethers.Contract(AUDIT_CONTRACT_ADDRESS, AUDIT_ABI, signer)
    }
  } catch (error) {
    console.error('Blockchain initialization error:', error)
  }
}

// Log audit event
export const logAuditEvent = async (eventType, userId, details, metadata = {}) => {
  const auditEntry = {
    eventType,
    userId,
    details,
    metadata,
    timestamp: new Date(),
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    deviceFingerprint: metadata.deviceFingerprint
  }
  
  // Save to MongoDB
  try {
    const log = new AuditLog(auditEntry)
    await log.save()
  } catch (error) {
    console.error('MongoDB audit log error:', error)
  }
  
  // Save to blockchain if enabled
  if (BLOCKCHAIN_ENABLED && contract) {
    try {
      const tx = await contract.logEvent(
        eventType,
        userId,
        JSON.stringify(details),
        Math.floor(Date.now() / 1000)
      )
      await tx.wait()
      console.log('Audit event logged to blockchain:', tx.hash)
    } catch (error) {
      console.error('Blockchain audit log error:', error)
    }
  }
  
  return auditEntry
}

// Get audit logs
export const getAuditLogs = async (filters = {}) => {
  const query = {}
  
  if (filters.userId) query.userId = filters.userId
  if (filters.eventType) query.eventType = filters.eventType
  if (filters.startDate) query.timestamp = { $gte: filters.startDate }
  if (filters.endDate) {
    query.timestamp = { ...query.timestamp, $lte: filters.endDate }
  }
  
  return AuditLog.find(query).sort({ timestamp: -1 }).limit(filters.limit || 1000)
}

// Export audit logs for compliance
export const exportAuditLogs = async (filters = {}, format = 'json') => {
  const logs = await getAuditLogs(filters)
  
  if (format === 'csv') {
    const csv = [
      'Event Type,User ID,Details,Timestamp,IP Address',
      ...logs.map(log => 
        `"${log.eventType}","${log.userId}","${log.details}","${log.timestamp}","${log.ipAddress || ''}"`
      )
    ].join('\n')
    return csv
  }
  
  if (format === 'json') {
    return JSON.stringify(logs, null, 2)
  }
  
  return logs
}

// Initialize blockchain on module load
initBlockchain()


