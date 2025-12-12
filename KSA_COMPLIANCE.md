# KSA Compliance Guide - Secure Web

This guide outlines how Secure Web complies with Saudi Arabia's cybersecurity regulations for 2025.

## Compliance Standards

### 1. SDAIA Personal Data Protection Law (PDPL)

**Data Subject Rights**
- ✅ Data access portal (`/data-rights`)
- ✅ Data deletion requests
- ✅ Data portability (export in readable format)
- ✅ Automated request processing

**Breach Notification**
- ✅ Automatic detection of data breaches
- ✅ Notification to SDAIA/NCA within 72 hours
- ✅ User notification system

**Consent Management**
- ✅ Arabic consent forms
- ✅ Explicit consent tracking
- ✅ Withdrawal mechanism

### 3. SAMA Cyber Security Framework (CSCC)

**Enhanced Encryption**
- ✅ Quantum-resistant encryption option
- ✅ Financial data protection
- ✅ Periodic compliance audits

### 4. Anti-Cyber Crime Law

**Content Moderation**
- ✅ Real-time content scanning
- ✅ Phishing/malware detection
- ✅ Unauthorized access prevention
- ✅ Data interference protection

## KSA-Specific Features

### Data Localization
- All data stored in AWS Middle East (Bahrain) region (`me-south-1`)
- No international data transfers without explicit consent
- Warning popups for non-KSA uploads

### IP Whitelisting
- Default: Only Saudi IP addresses allowed
- Admin override available
- Real-time IP validation

### Mandatory MFA
- Required for all logins in KSA mode
- Supports WebAuthn and TOTP
- Arabic setup instructions

### Saudi CERT Integration
- "Report Incident" button in Security Center
- Direct integration with saudicert.gov.sa
- Automated incident logging

### Arabic Support
- Full RTL (Right-to-Left) layout support
- Arabic translations for all UI elements
- Arabic notifications and alerts
- Language switcher in navigation

## Setup Instructions

### 1. Enable KSA Mode

In `.env`:
```env
KSA_HIGH_SECURITY_MODE=true
```

### 2. Configure AWS Region

The system automatically uses `me-south-1` when KSA mode is enabled:
```env
AWS_REGION=me-south-1
```

### 3. Configure API Keys

```env
SAUDI_CERT_API_KEY=your-key
NCA_API_KEY=your-key
SDAIA_API_KEY=your-key
```

### 4. IP Whitelisting

By default, only Saudi IPs are allowed. To customize:
- Edit `server/utils/ksaCompliance.js`
- Update `SAUDI_IP_RANGES` array

## Compliance Dashboard

Access the Security Center (`/security`) to view:
- PDPL compliance status
- SAMA alignment percentage
- Overall KSA compliance score

## Data Rights Portal

Users can access their data rights at `/data-rights`:
- Request data access
- Request data deletion
- Request data portability

All requests are logged and processed automatically.

## Incident Reporting

### Report to Saudi CERT
1. Navigate to Security Center
2. Click "Report Incident"
3. Fill in incident details
4. System automatically reports to Saudi CERT

### Breach Detection
- Automatic detection of data breaches
- Notification to SDAIA/NCA within 72 hours
- User notification system

## Audit Logs

All actions are logged immutably:
- Blockchain-based logging (optional)
- MongoDB audit trail
- Exportable in Arabic/English
- NCA-compliant format

## Testing Compliance

Run compliance tests:
```bash
npm run test:security
```

## Support

For compliance questions:
- Email: compliance@cybrany.com
- Saudi CERT: https://saudicert.gov.sa
- NCA: https://nca.gov.sa
- SDAIA: https://sdaia.gov.sa

---

**Last Updated:** 2025
**Version:** 2.0.0

