import { describe, it, expect } from '@jest/globals'
import { encryptData, decryptData, hashFile, generateKeyPair } from '../utils/encryption.js'
import { scanChatMessage, scanFile } from '../utils/threatDetection.js'
import { scanForSensitiveData } from '../utils/dlp.js'

describe('Security Functions', () => {
  describe('Encryption', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const testData = 'Sensitive information'
      const { publicKey, privateKey } = await generateKeyPair()
      
      const encrypted = await encryptData(testData, publicKey, privateKey)
      expect(encrypted.encrypted).toBeDefined()
      expect(encrypted.nonce).toBeDefined()
      
      const decrypted = await decryptData(
        encrypted.encrypted,
        encrypted.nonce,
        publicKey,
        privateKey
      )
      expect(decrypted).toBe(testData)
    })
  })

  describe('Threat Detection', () => {
    it('should detect phishing patterns in messages', async () => {
      const maliciousMessage = 'Click here: https://bit.ly/suspicious-link'
      const threats = await scanChatMessage(maliciousMessage)
      expect(threats.length).toBeGreaterThan(0)
      expect(threats[0].type).toBe('phishing')
    })

    it('should detect suspicious file extensions', async () => {
      const fileBuffer = Buffer.from('test')
      const threats = await scanFile(fileBuffer, 'malware.exe', 'application/x-msdownload')
      expect(threats.some(t => t.type === 'suspicious_extension')).toBe(true)
    })
  })

  describe('DLP', () => {
    it('should detect email addresses', () => {
      const text = 'Contact me at user@example.com'
      const findings = scanForSensitiveData(text)
      expect(findings.some(f => f.category === 'email')).toBe(true)
    })

    it('should detect credit card numbers', () => {
      const text = 'Card: 1234-5678-9012-3456'
      const findings = scanForSensitiveData(text)
      expect(findings.some(f => f.category === 'creditCard')).toBe(true)
    })
  })
})

