import fetch from 'node-fetch'
import crypto from 'crypto'

const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY || ''
const THREAT_INTELLIGENCE_ENABLED = process.env.THREAT_INTELLIGENCE_ENABLED === 'true'

// Phishing patterns
const PHISHING_PATTERNS = [
  /https?:\/\/[^\s]+(?:bit\.ly|tinyurl|t\.co|goo\.gl)/gi,
  /(?:urgent|verify|suspended|account|password|click here)/gi,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
]

// Malware indicators
const MALWARE_INDICATORS = [
  /\.exe|\.bat|\.cmd|\.scr|\.vbs|\.js$/i,
  /powershell|cmd\.exe|wscript/i
]

// Scan chat message for threats
export const scanChatMessage = async (message) => {
  const threats = []
  
  // Check for phishing patterns
  for (const pattern of PHISHING_PATTERNS) {
    if (pattern.test(message)) {
      threats.push({
        type: 'phishing',
        severity: 'high',
        message: 'Potential phishing content detected'
      })
    }
  }
  
  // Check for suspicious links
  const urlRegex = /https?:\/\/[^\s]+/g
  const urls = message.match(urlRegex) || []
  
  for (const url of urls) {
    if (await checkURLThreat(url)) {
      threats.push({
        type: 'malicious_url',
        severity: 'high',
        message: `Malicious URL detected: ${url}`
      })
    }
  }
  
  return threats
}

// Check URL against threat intelligence
const checkURLThreat = async (url) => {
  if (!THREAT_INTELLIGENCE_ENABLED || !VIRUSTOTAL_API_KEY) {
    return false // Mock mode
  }
  
  try {
    const urlHash = crypto.createHash('sha256').update(url).digest('hex')
    const response = await fetch(`https://www.virustotal.com/vtapi/v2/url/report?apikey=${VIRUSTOTAL_API_KEY}&resource=${encodeURIComponent(url)}`)
    const data = await response.json()
    
    return data.response_code === 1 && data.positives > 0
  } catch (error) {
    console.error('Threat intelligence check error:', error)
    return false
  }
}

// Scan file for threats
export const scanFile = async (fileBuffer, fileName, fileType) => {
  const threats = []
  
  // Check file extension
  for (const indicator of MALWARE_INDICATORS) {
    if (indicator.test(fileName)) {
      threats.push({
        type: 'suspicious_extension',
        severity: 'medium',
        message: `Suspicious file extension: ${fileName}`
      })
    }
  }
  
  // Check file hash against threat feeds
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')
  if (await checkFileHashThreat(fileHash)) {
    threats.push({
      type: 'known_malware',
      severity: 'critical',
      message: 'File hash matches known malware'
    })
  }
  
  // Anomaly detection in file metadata
  if (fileBuffer.length > 100 * 1024 * 1024) { // > 100MB
    threats.push({
      type: 'size_anomaly',
      severity: 'low',
      message: 'Unusually large file size'
    })
  }
  
  return threats
}

// Check file hash against threat intelligence
const checkFileHashThreat = async (hash) => {
  if (!THREAT_INTELLIGENCE_ENABLED || !VIRUSTOTAL_API_KEY) {
    return false // Mock mode
  }
  
  try {
    const response = await fetch(`https://www.virustotal.com/vtapi/v2/file/report?apikey=${VIRUSTOTAL_API_KEY}&resource=${hash}`)
    const data = await response.json()
    
    return data.response_code === 1 && data.positives > 0
  } catch (error) {
    console.error('File hash threat check error:', error)
    return false
  }
}

// Behavioral anomaly detection
export const detectBehavioralAnomaly = (userId, action, context) => {
  const anomalies = []
  
  // Rapid file shares
  if (action === 'share' && context.rapidShares > 10) {
    anomalies.push({
      type: 'rapid_sharing',
      severity: 'medium',
      message: 'Unusual rapid file sharing pattern detected'
    })
  }
  
  // Unusual join patterns
  if (action === 'join_room' && context.unusualTime) {
    anomalies.push({
      type: 'unusual_access_time',
      severity: 'low',
      message: 'Access during unusual hours'
    })
  }
  
  return anomalies
}


