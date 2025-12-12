import express from 'express'
import { RtcTokenBuilder, RtcRole } from 'agora-access-token'

const router = express.Router()

const APP_ID = process.env.AGORA_APP_ID || 'YOUR_AGORA_APP_ID'
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || 'YOUR_AGORA_APP_CERTIFICATE'

router.get('/token', (req, res) => {
  const { channelName } = req.query

  if (!channelName) {
    return res.status(400).json({ error: 'channelName is required' })
  }

  const uid = Math.floor(Math.random() * 100000)
  const role = RtcRole.PUBLISHER
  const expirationTimeInSeconds = 3600
  const currentTimestamp = Math.floor(Date.now() / 1000)
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  )

  res.json({
    token,
    uid,
    appId: APP_ID,
    channelName
  })
})

export default router

