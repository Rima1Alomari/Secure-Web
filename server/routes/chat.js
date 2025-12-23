import express from 'express'
import OpenAI from 'openai'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

// Initialize OpenAI for chat features
const apiKey = process.env.OPENAI_API_KEY
let openai = null
try {
  if (apiKey) {
    openai = new OpenAI({ apiKey })
    console.log('✅ OpenAI initialized for chat features')
  }
} catch (error) {
  console.error('❌ Failed to initialize OpenAI for chat:', error)
}

// Summarize conversation
router.post('/summarize', authenticate, async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not available' })
    }

    const { messages } = req.body
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    const conversation = messages
      .slice(-50) // Last 50 messages
      .map(msg => `${msg.sender}: ${msg.message}`)
      .join('\n')

    const prompt = `Summarize this conversation in 3-5 bullet points. Focus on key topics, decisions, and action items:

${conversation}

Provide a concise summary.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 300
    })

    res.json({ 
      summary: completion.choices[0].message.content.trim()
    })
  } catch (error) {
    console.error('Error summarizing conversation:', error)
    res.status(500).json({ error: 'Failed to summarize conversation' })
  }
})

export default router

