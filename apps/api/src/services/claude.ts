import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'test' })

interface CaptionInput {
  mode: 'feed' | 'story'
  tone: string
  topic?: string
  niche?: string
}

interface CaptionOutput {
  caption: string
  hashtags: string[]
  cta: string
}

export async function generateCaption(input: CaptionInput): Promise<CaptionOutput> {
  const { mode, tone, topic, niche } = input

  const prompt = `You are an expert Instagram content strategist.
Write a ${mode === 'story' ? 'short punchy Instagram Story caption (max 80 chars)' : 'compelling Instagram Feed post caption (max 180 chars)'}.
Tone: ${tone}. ${topic ? 'Topic: ' + topic + '.' : ''} ${niche ? 'Niche/profile: ' + niche + '.' : ''}
Return ONLY valid JSON, no markdown, no backticks:
{"caption":"...","hashtags":["tag1","tag2","tag3","tag4","tag5"],"cta":"one short call-to-action line"}`

  const message = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 350,
    messages: [{ role: 'user', content: prompt }],
  })

  // @ts-ignore
  const text = message.content[0].text
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}
