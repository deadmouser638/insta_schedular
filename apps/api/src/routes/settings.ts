import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validate'

export const settingsRouter = Router()
settingsRouter.use(authMiddleware)

settingsRouter.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { niche: true, defaultTone: true },
    })
    res.json(user)
  } catch (err) {
    next(err)
  }
})

const updateSchema = z.object({
  niche: z.string().max(200).optional(),
  defaultTone: z.enum(['motivational', 'chill', 'funny', 'storytelling', 'minimal', 'promotional']).optional(),
})

settingsRouter.patch('/', validate(updateSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
      select: { niche: true, defaultTone: true },
    })
    res.json(user)
  } catch (err) {
    next(err)
  }
})
