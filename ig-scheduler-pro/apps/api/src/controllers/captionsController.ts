import { Response, NextFunction } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { AuthRequest } from '../middleware/auth';

export const captionSchema = z.object({
  topic: z.string().min(1),
  niche: z.string().optional().default('General'),
  tone: z.string().optional().default('chill'),
  mode: z.enum(['feed', 'story']).default('feed')
});

export const captionsController = {
  generateCaption: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { topic, niche, tone, mode } = req.body;
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      
      const constraint = mode === 'story' ? 'Keep it extremely short, max 10 words, under 80 chars total.' : 'Provide a well-structured feed post with line breaks and an engaging hook.';
      
      const prompt = `You are a social media manager for the niche: ${niche}.
Write an Instagram ${mode} caption about: ${topic}.
The tone should be: ${tone}.
${constraint}

Return ONLY raw JSON with the following structure. No markdown, no backticks, just the json object:
{ "caption": "...", "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"] }`;

      const aiResponse = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      });

      const raw = (aiResponse.content[0] as any).text.trim();
      const cleaned = raw.replace(/```json|```/g, '').trim();
      
      const parsed = JSON.parse(cleaned);
      res.json(parsed);
    } catch (e: any) {
      if (e.message?.includes('JSON')) {
        return res.status(502).json({ error: 'Failed to parse AI response. Try again.' });
      }
      next(e);
    }
  }
};
