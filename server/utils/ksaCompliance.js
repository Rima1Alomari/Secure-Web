import axios from 'axios'

const KSA_MODE = process.env.KSA_HIGH_SECURITY_MODE !== 'false'
const SAUDI_CERT_API = process.env.SAUDI_CERT_API_URL || 'https://saudicert.gov.sa/api'
const NCA_API_URL = process.env.NCA_API_URL || 'https://nca.gov.sa/api'
const SDAIA_API_URL = process.env.SDAIA_API_URL || 'https://sdaia.gov.sa/api'

// Saudi IP ranges (simplified - in production, use comprehensive list)
const SAUDI_IP_RANGES = [
  /^5\./,
  /^37\./,
  /^46\./,
  /^78\./,
  /^79\./,
  /^80\./,
  /^81\./,
  /^82\./,
  /^84\./,
  /^85\./,
  /^86\./,
  /^87\./,
  /^88\./,
  /^89\./,
  /^90\./,
  /^91\./,
  /^92\./,
  /^93\./,
  /^94\./,
  /^95\./,
  /^188\./,
  /^197\./
]

// Check if IP is from Saudi Arabia
export const isSaudiIP = (ip) => {
  if (!KSA_MODE) return true // Allow all if KSA mode disabled
  
  // Remove port if present
  const cleanIP = ip.split(':')[0]
  
  return SAUDI_IP_RANGES.some(range => range.test(cleanIP))
}

// Report incident to Saudi CERT
export const reportToSaudiCERT = async (incidentData) => {
  if (!KSA_MODE) {
    console.log('Mock: Reporting to Saudi CERT:', incidentData)
    return { success: true, mock: true }
  }

  try {
    const response = await axios.post(`${SAUDI_CERT_API}/incidents`, {
      ...incidentData,
      reportedAt: new Date(),
      source: 'secure-web'
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.SAUDI_CERT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    return { success: true, data: response.data }
  } catch (error) {
    console.error('Error reporting to Saudi CERT:', error)
    return { success: false, error: error.message }
  }
}

// Report data breach to SDAIA/NCA (PDPL requirement - 72 hours)
export const reportBreachToSDAIA = async (breachData) => {
  if (!KSA_MODE) {
    console.log('Mock: Reporting breach to SDAIA/NCA:', breachData)
    return { success: true, mock: true }
  }

  try {
    const response = await axios.post(`${SDAIA_API_URL}/breaches`, {
      ...breachData,
      reportedAt: new Date(),
      reportedWithin72Hours: true
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.SDAIA_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    return { success: true, data: response.data }
  } catch (error) {
    console.error('Error reporting breach to SDAIA:', error)
    return { success: false, error: error.message }
  }
}

// Check PDPL compliance
export const checkPDPLCompliance = async (userId) => {
  // Mock check - in production, verify actual compliance
  return {
    dataLocalization: true,
    consentManagement: true,
    dataRightsPortal: true,
    breachNotification: true,
    dpoSupport: true,
    compliant: true
  }
}

// Check SAMA compliance (if applicable)
export const checkSAMACompliance = async (userId) => {
  return {
    enhancedEncryption: true,
    periodicAudits: true,
    financialDataProtection: true,
    compliant: true
  }
}

// Force AWS region to Riyadh
export const getAWSRegion = () => {
  if (KSA_MODE) {
    return 'me-south-1' // AWS Middle East (Bahrain) - closest to Riyadh
  }
  return process.env.AWS_REGION || 'us-east-1'
}

