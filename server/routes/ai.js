import express from 'express'
import OpenAI from 'openai'
// import { authenticate } from '../middleware/auth.js' // Temporarily disabled for testing

const router = express.Router()

// Initialize OpenAI
let openai = null
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
    console.log('✅ OpenAI initialized successfully')
  } else {
    console.warn('⚠️ OPENAI_API_KEY not found in environment variables')
  }
} catch (error) {
  console.error('❌ Failed to initialize OpenAI:', error)
}

// AI Chatbot endpoint (temporarily without auth for testing)
router.post('/chat', async (req, res) => {
  console.log('📨 Received chat request:', {
    message: req.body.message?.substring(0, 50),
    hasHistory: !!req.body.conversationHistory?.length
  })
  
  try {
    const { message, conversationHistory = [] } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (!openai) {
      console.error('❌ OpenAI not initialized')
      return res.status(500).json({ 
        error: 'AI service not configured',
        message: 'OpenAI API key is missing. Please set OPENAI_API_KEY in your .env file.'
      })
    }

    // Build conversation messages
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful AI assistant for Secure Web, a secure collaboration platform. Help users with questions about meetings, files, scheduling, security, and general platform usage. Be concise and professional.'
      },
      ...conversationHistory.map(msg => ({
        role: msg.isBot ? 'assistant' : 'user',
        content: msg.text
      })),
      {
        role: 'user',
        content: message
      }
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500
    })

    const aiResponse = completion.choices[0].message.content
    console.log('✅ AI response generated:', aiResponse.substring(0, 50))

    res.json({
      response: aiResponse,
      usage: completion.usage
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    
    // Provide more detailed error messages
    let errorMessage = 'AI service temporarily unavailable'
    if (error.message) {
      if (error.message.includes('API key')) {
        errorMessage = 'OpenAI API key is invalid or missing. Please check your .env file.'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.'
      } else if (error.message.includes('insufficient_quota')) {
        errorMessage = 'OpenAI API quota exceeded. Please check your account.'
      } else {
        errorMessage = error.message
      }
    }
    
    res.status(500).json({ 
      error: errorMessage,
      message: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// AI Meeting Summary
router.post('/meeting-summary', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { transcript, participants, duration } = req.body

    const prompt = `Generate a concise meeting summary from the following transcript:
    
Participants: ${participants?.join(', ') || 'Unknown'}
Duration: ${duration || 'Unknown'}
    
Transcript:
${transcript || 'No transcript available'}

Please provide:
1. Key discussion points
2. Decisions made
3. Action items
4. Next steps

Format as a structured summary.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800
    })

    res.json({
      summary: completion.choices[0].message.content
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to generate meeting summary' })
  }
})

// AI Smart Scheduling Suggestions
router.post('/scheduling-suggestions', async (req, res) => {
  try {
    const { participants, duration, preferences } = req.body

    const prompt = `Based on the following information, suggest the best meeting times:
    
Participants: ${participants?.join(', ') || 'Unknown'}
Duration: ${duration || '30 minutes'}
Preferences: ${JSON.stringify(preferences || {})}

Provide 3-5 suggested time slots with availability percentages. Consider time zones and typical working hours.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500
    })

    res.json({
      suggestions: completion.choices[0].message.content
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to generate scheduling suggestions' })
  }
})

// AI Auto-Reply Suggestions
router.post('/auto-reply', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { message, context } = req.body

    const prompt = `Based on this message: "${message}", suggest 3 short, professional reply options. Context: ${context || 'General conversation'}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 200
    })

    const suggestions = completion.choices[0].message.content
      .split('\n')
      .filter(line => line.trim())
      .slice(0, 3)
      .map(line => line.replace(/^\d+\.\s*/, '').trim())

    res.json({ suggestions })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to generate reply suggestions' })
  }
})

// AI File Search (NLP)
router.post('/file-search', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { query, files } = req.body

    if (!query || !files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Query and files array are required' })
    }

    const prompt = `Based on this search query: "${query}", analyze the following files and return the most relevant ones. Return only file names in a JSON array format.

Files:
${files.map(f => `- ${f.name} (${f.type}, ${f.size} bytes)`).join('\n')}

Return only a JSON array of the most relevant file names.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content)
    const relevantFiles = files.filter(f => 
      result.relevant_files?.some((name: string) => f.name.includes(name))
    )

    res.json({ files: relevantFiles })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to search files' })
  }
})

// AI Auto-Tagging
router.post('/auto-tag', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { fileName, fileType, content } = req.body

    const prompt = `Analyze this file and suggest relevant tags:
    
File Name: ${fileName}
File Type: ${fileType}
Content Preview: ${content?.substring(0, 500) || 'N/A'}

Return 3-5 relevant tags as a JSON array.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 150,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content)
    res.json({ tags: result.tags || [] })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to generate tags' })
  }
})

// AI Transcription (for audio/video files)
router.post('/transcribe', async (req, res) => {
  try {
    const { audioUrl, language } = req.body

    // Note: This would require the actual audio file
    // For now, return a mock response
    res.json({ 
      transcript: 'Transcription service requires audio file upload. This is a placeholder response.',
      language: language || 'en'
    })
  } catch (error) {
    console.error('Transcription error:', error)
    res.status(500).json({ error: 'Failed to transcribe audio' })
  }
})

// AI Activity Insights
router.post('/activity-insights', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { activities } = req.body

    const prompt = `Analyze these user activities and provide insights:
    
${JSON.stringify(activities, null, 2)}

Provide:
1. Most active time periods
2. Activity trends
3. Recommendations for productivity`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 400
    })

    res.json({
      insights: completion.choices[0].message.content
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to generate insights' })
  }
})

// AI Priority Suggestions
router.post('/priority-suggestions', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { items } = req.body

    const prompt = `Based on these items, suggest priorities:
    
${JSON.stringify(items, null, 2)}

Return high, medium, and low priority items.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 300
    })

    res.json({
      priorities: completion.choices[0].message.content
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to generate priorities' })
  }
})

// AI File Recovery Prediction
router.post('/recovery-prediction', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { files } = req.body

    const prompt = `Analyze these deleted files and predict recovery probability:
    
${JSON.stringify(files, null, 2)}

For each file, provide recovery probability percentage and reasoning.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 400
    })

    res.json({
      predictions: completion.choices[0].message.content
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to generate predictions' })
  }
})

// AI Anomaly Detection Analysis
router.post('/anomaly-analysis', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { events, patterns } = req.body

    const prompt = `Analyze these security events for anomalies:
    
Events: ${JSON.stringify(events, null, 2)}
Patterns: ${JSON.stringify(patterns, null, 2)}

Identify any suspicious patterns or anomalies.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    })

    res.json({
      analysis: completion.choices[0].message.content,
      anomalies: []
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to analyze anomalies' })
  }
})

// AI User Management Suggestions
router.post('/user-suggestions', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { users, activity } = req.body

    const prompt = `Analyze user data and provide management suggestions:
    
Users: ${JSON.stringify(users, null, 2)}
Activity: ${JSON.stringify(activity, null, 2)}

Suggest role changes, access modifications, or other improvements.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 400
    })

    res.json({
      suggestions: completion.choices[0].message.content
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to generate suggestions' })
  }
})

// AI Performance Analytics
router.post('/performance-analytics', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { metrics, timeRange } = req.body

    const prompt = `Analyze these performance metrics:
    
${JSON.stringify(metrics, null, 2)}
Time Range: ${timeRange || 'Last 30 days'}

Provide insights on trends, improvements, and recommendations.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 500
    })

    res.json({
      analytics: completion.choices[0].message.content
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to generate analytics' })
  }
})

// AI Meeting Prediction
router.post('/meeting-prediction', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { calendar, participants } = req.body

    const prompt = `Predict potential meeting conflicts and outcomes:
    
Calendar: ${JSON.stringify(calendar, null, 2)}
Participants: ${participants?.join(', ') || 'Unknown'}

Identify conflicts, suggest alternatives, and predict meeting success probability.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 400
    })

    res.json({
      predictions: completion.choices[0].message.content
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to generate predictions' })
  }
})

export default router

