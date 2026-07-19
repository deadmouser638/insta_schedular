import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validate'

export const captionsRouter = Router()
captionsRouter.use(authMiddleware)

const generateSchema = z.object({
  mode: z.enum(['feed', 'story']),
  tone: z.enum(['motivational', 'chill', 'funny', 'storytelling', 'minimal', 'promotional']),
  topic: z.string().max(200).optional(),
  niche: z.string().max(200).optional(),
})

captionsRouter.post('/generate', validate(generateSchema), async (req, res, next) => {
  try {
    const { mode, tone, topic, niche } = req.body

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = `You are an expert Instagram content strategist.
Write a ${mode === 'story' ? 'short punchy Instagram Story caption (max 80 chars)' : 'compelling Instagram Feed post caption (max 180 chars)'}.
Tone: ${tone}.${topic ? ` Topic: ${topic}.` : ''}${niche ? ` Niche/profile: ${niche}.` : ''}
Return ONLY valid JSON with no markdown, no backticks, no preamble:
{"caption":"...","hashtags":["tag1","tag2","tag3","tag4","tag5"],"cta":"one short call-to-action line"}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as any).text?.trim()
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    res.json(parsed)
  } catch (err: any) {
    if (err.message?.includes('JSON')) {
      return next({ statusCode: 502, message: 'Claude returned invalid JSON — retry' } as any)
    }
    next(err)
  }
})
