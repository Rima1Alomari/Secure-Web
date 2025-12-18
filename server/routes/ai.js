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
    const { message, conversationHistory = [], systemPrompt } = req.body

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
        content: systemPrompt || 'You are a helpful AI assistant for Secure Web, a secure collaboration platform. Help users with questions about meetings, files, scheduling, security, and general platform usage. Be concise and professional.'
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

// AI Document Summarization
router.post('/summarize-document', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { content, fileName, fileType, maxLength = 200 } = req.body

    if (!content) {
      return res.status(400).json({ error: 'Document content is required' })
    }

    const prompt = `Summarize the following document in ${maxLength} words or less. Focus on key points, main ideas, and important details.

File: ${fileName || 'Untitled'}
Type: ${fileType || 'Unknown'}

Content:
${content.substring(0, 8000)}${content.length > 8000 ? '...' : ''}

Provide a concise summary that captures the essence of the document.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: Math.min(maxLength * 2, 500)
    })

    res.json({
      summary: completion.choices[0].message.content,
      wordCount: completion.choices[0].message.content.split(/\s+/).length
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to summarize document' })
  }
})

// AI Content Generation
router.post('/generate-content', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { type, context, tone = 'professional' } = req.body

    if (!type || !context) {
      return res.status(400).json({ error: 'Type and context are required' })
    }

    let prompt = ''

    switch (type) {
      case 'meeting_agenda':
        prompt = `Generate a professional meeting agenda based on:
Title: ${context.title || 'Meeting'}
Duration: ${context.duration || '60 minutes'}
Participants: ${context.participants?.join(', ') || 'Team members'}
Topics: ${context.topics?.join(', ') || 'General discussion'}

Create a structured agenda with time allocations.`
        break
      
      case 'meeting_notes':
        prompt = `Generate structured meeting notes from:
Title: ${context.title || 'Meeting'}
Participants: ${context.participants?.join(', ') || 'Team'}
Discussion Points: ${context.discussion || 'Various topics discussed'}

Format as: Key Points, Decisions Made, Action Items, Next Steps.`
        break
      
      case 'email':
        prompt = `Write a ${tone} email:
Subject: ${context.subject || 'Message'}
Recipient: ${context.recipient || 'Colleague'}
Purpose: ${context.purpose || 'General communication'}
Key Points: ${context.keyPoints?.join(', ') || 'None specified'}

Write a clear, professional email.`
        break
      
      case 'report':
        prompt = `Generate a ${tone} report:
Title: ${context.title || 'Report'}
Sections: ${context.sections?.join(', ') || 'Summary, Findings, Recommendations'}
Data: ${context.data || 'No specific data provided'}

Create a well-structured report.`
        break
      
      default:
        return res.status(400).json({ error: 'Invalid content type' })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 800
    })

    res.json({
      content: completion.choices[0].message.content,
      type
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to generate content' })
  }
})

// AI Smart Search (Natural Language)
router.post('/smart-search', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { query, items } = req.body

    if (!query || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Query and items array are required' })
    }

    const prompt = `Based on this natural language search query: "${query}", analyze the following items and return the most relevant ones in JSON format.

Items:
${items.map((item, idx) => {
  const title = item.title || item.name || `Item ${idx + 1}`
  const metadata = item.metadata || item.description || item.type || ''
  return `${idx + 1}. ${title} (${metadata})`
}).join('\n')}

Return a JSON object with:
- relevant_items: array of item indices (1-based) that match the query
- reasoning: brief explanation of why these items match
- search_terms: extracted key terms from the query

Format: {"relevant_items": [1, 3, 5], "reasoning": "...", "search_terms": ["term1", "term2"]}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content)
    const relevantItems = items.filter((_, idx) => 
      result.relevant_items?.includes(idx + 1)
    )

    res.json({
      items: relevantItems,
      reasoning: result.reasoning,
      searchTerms: result.search_terms || [],
      totalMatches: relevantItems.length
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to perform smart search' })
  }
})

// AI Security Threat Analysis
router.post('/security-analysis', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { events, logs, timeRange = '24h' } = req.body

    const prompt = `Analyze these security events and logs for potential threats:

Time Range: ${timeRange}
Events: ${JSON.stringify(events?.slice(0, 50) || [], null, 2)}
Recent Logs: ${JSON.stringify(logs?.slice(0, 50) || [], null, 2)}

Provide:
1. Threat Level Assessment (Low/Medium/High/Critical)
2. Identified Patterns
3. Anomalies Detected
4. Recommended Actions
5. Risk Score (0-100)

Format as structured JSON with these fields.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    })

    const analysis = JSON.parse(completion.choices[0].message.content)

    res.json({
      threatLevel: analysis.threat_level || 'Low',
      patterns: analysis.patterns || [],
      anomalies: analysis.anomalies || [],
      recommendations: analysis.recommended_actions || [],
      riskScore: analysis.risk_score || 0,
      analysis: completion.choices[0].message.content
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to analyze security threats' })
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

// AI Meeting Optimization
router.post('/meeting-optimization', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { meetingTitle, description, time, date, location, invitedUsers, duration } = req.body

    // Get current date for context
    const now = new Date()
    const currentDateStr = now.toISOString().split('T')[0]
    const currentDateFormatted = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    // Validate and format the proposed date
    let dateAnalysis = 'Not specified'
    let dateWarning = ''
    if (date) {
      const proposedDate = new Date(date)
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      proposedDate.setHours(0, 0, 0, 0)
      
      if (proposedDate < today) {
        dateWarning = `⚠️ WARNING: The proposed date (${date}) is in the past. Only suggest future dates.`
        dateAnalysis = `${date} (INVALID - PAST DATE)`
      } else {
        const daysDiff = Math.ceil((proposedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        dateAnalysis = `${date} (${daysDiff} day${daysDiff !== 1 ? 's' : ''} from now)`
      }
    }

    const prompt = `You are a meeting optimization assistant. Today is ${currentDateFormatted} (${currentDateStr}).

Analyze this meeting request and provide optimization suggestions:

Meeting Title: ${meetingTitle || 'Untitled Meeting'}
Description: ${description || 'No description'}
Proposed Date: ${dateAnalysis}
${dateWarning ? dateWarning + '\n' : ''}Proposed Time: ${time || 'Not specified'}
Duration: ${duration || 60} minutes
Location: ${location || 'Not specified'}
Invited Users: ${invitedUsers?.length || 0} participants

IMPORTANT RULES:
- Today is ${currentDateFormatted} (${currentDateStr})
- NEVER suggest dates in the past
- Only suggest dates from tomorrow onwards
- For time suggestions, consider typical working hours (9 AM - 5 PM)
- If the proposed date is in the past, suggest alternative future dates instead

Please provide optimization suggestions including:
1. Best time slot recommendations (only future dates and times)
2. Duration optimization
3. Participant suggestions
4. Agenda recommendations
5. Meeting format suggestions (online vs in-person)
6. Preparation tips

${dateWarning ? 'CRITICAL: The proposed date is in the past. You MUST suggest alternative future dates.' : ''}

Format as clear, actionable suggestions. Always use actual future dates in your suggestions.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 600
    })

    res.json({
      suggestions: completion.choices[0].message.content,
      response: completion.choices[0].message.content
    })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ 
      error: 'Failed to generate meeting optimization',
      suggestions: 'Unable to generate optimization suggestions at this time.'
    })
  }
})

// AI Smart Scheduling Suggestions
router.post('/scheduling-suggestions', async (req, res) => {
  try {
    if (!openai) {
      return res.status(500).json({ error: 'AI service not configured' })
    }

    const { participants, duration, preferences } = req.body

    // Get current date for context
    const now = new Date()
    const currentDateStr = now.toISOString().split('T')[0]
    const currentDateFormatted = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    const prompt = `You are a smart scheduling assistant. Today is ${currentDateFormatted} (${currentDateStr}).

Based on the following information, suggest the best meeting times:
    
Participants: ${participants?.join(', ') || 'Unknown'}
Duration: ${duration || '30 minutes'}
Preferences: ${JSON.stringify(preferences || {})}

CRITICAL RULES:
- Today is ${currentDateFormatted} (${currentDateStr})
- ONLY suggest dates from tomorrow onwards (future dates only)
- NEVER suggest dates in the past
- Provide 3-5 suggested time slots with specific dates and times
- Include availability percentages
- Consider time zones and typical working hours (9 AM - 5 PM)
- Format dates as YYYY-MM-DD for clarity

Example format:
1. December 20, 2024 (Friday) at 10:00 AM - 11:00 AM (90% availability)
2. December 21, 2024 (Saturday) at 2:00 PM - 3:00 PM (85% availability)

Provide actual future dates, not relative dates like "next week".`

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
      result.relevant_files?.some((name) => f.name.includes(name))
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

    const { events, patterns, auditLogs, timeRange } = req.body

    const prompt = `Analyze these security events for anomalies:
    
Events: ${JSON.stringify(events?.slice(0, 100) || [], null, 2)}
Patterns: ${JSON.stringify(patterns || {}, null, 2)}
Audit Logs: ${JSON.stringify(auditLogs?.slice(0, 100) || [], null, 2)}
Time Range: ${timeRange || '24h'}

Identify any suspicious patterns or anomalies. Return as JSON with:
- anomalies: array of detected anomalies with type, severity, description, recommendation
- threat_level: overall threat level (Low/Medium/High/Critical)
- risk_score: numeric risk score 0-100`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(completion.choices[0].message.content)

    res.json({
      analysis: completion.choices[0].message.content,
      anomalies: result.anomalies || [],
      threatLevel: result.threat_level || 'Low',
      riskScore: result.risk_score || 0
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
