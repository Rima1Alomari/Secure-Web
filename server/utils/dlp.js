import nlp from 'compromise'

// PII Patterns
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g
}

// Credential patterns
const CREDENTIAL_PATTERNS = {
  password: /password\s*[:=]\s*\S+/gi,
  apiKey: /(?:api[_-]?key|apikey)\s*[:=]\s*[a-zA-Z0-9]{20,}/gi,
  token: /(?:token|bearer)\s*[:=]\s*[a-zA-Z0-9]{20,}/gi
}

// Scan text for sensitive data
export const scanForSensitiveData = (text) => {
  const findings = []
  
  // Check PII patterns
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern)
    if (matches) {
      findings.push({
        type: 'pii',
        category: type,
        count: matches.length,
        severity: 'high',
        message: `Detected ${matches.length} ${type} pattern(s)`
      })
    }
  }
  
  // Check credential patterns
  for (const [type, pattern] of Object.entries(CREDENTIAL_PATTERNS)) {
    const matches = text.match(pattern)
    if (matches) {
      findings.push({
        type: 'credential',
        category: type,
        count: matches.length,
        severity: 'critical',
        message: `Potential ${type} exposure detected`
      })
    }
  }
  
  // NLP-based detection for names, addresses
  const doc = nlp(text)
  const people = doc.people().out('array')
  if (people.length > 0) {
    findings.push({
      type: 'pii',
      category: 'name',
      count: people.length,
      severity: 'medium',
      message: `Detected ${people.length} potential name(s)`
    })
  }
  
  return findings
}

// Redact sensitive data
export const redactSensitiveData = (text, findings) => {
  let redacted = text
  
  for (const finding of findings) {
    if (finding.type === 'pii') {
      const pattern = PII_PATTERNS[finding.category]
      if (pattern) {
        redacted = redacted.replace(pattern, '[REDACTED]')
      }
    } else if (finding.type === 'credential') {
      const pattern = CREDENTIAL_PATTERNS[finding.category]
      if (pattern) {
        redacted = redacted.replace(pattern, (match) => {
          const parts = match.split(/[:=]/)
          return parts[0] + ': [REDACTED]'
        })
      }
    }
  }
  
  return redacted
}

// Scan file content for sensitive data
export const scanFileContent = async (fileBuffer, fileName) => {
  try {
    // For text files, read and scan
    if (fileName.match(/\.(txt|md|log|csv|json)$/i)) {
      const content = fileBuffer.toString('utf-8')
      return scanForSensitiveData(content)
    }
    
    // For binary files, check metadata and filename
    const fileNameFindings = scanForSensitiveData(fileName)
    return fileNameFindings
  } catch (error) {
    console.error('File content scan error:', error)
    return []
  }
}


