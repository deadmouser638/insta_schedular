import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { notFound, badRequest } from '../lib/errors'

export const postsRouter = Router()
postsRouter.use(authMiddleware)

// ── LIST posts ────────────────────────────────────────────────────
// GET /api/posts?status=scheduled&igAccountId=xxx&type=feed&from=...&to=...
postsRouter.get('/', async (req, res, next) => {
  try {
    const { type, status, igAccountId, from, to } = req.query as Record<string, string>

    const posts = await prisma.post.findMany({
      where: {
        userId: req.user!.id,
        // If status=all or no status, exclude deleted; otherwise filter to exact status
        ...(status && status !== 'all'
          ? { status: status }
          : { status: { not: 'deleted' } }),
        ...(type ? { type } : {}),
        ...(igAccountId ? { igAccountId } : {}),
        ...(from || to
          ? {
              scheduledAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        igAccount: {
          select: {
            id: true,
            igUserId: true,
            igUsername: true,
            isActive: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    res.json(posts)
  } catch (err) {
    next(err)
  }
})

// ── GET single post ───────────────────────────────────────────────
postsRouter.get('/:id', async (req, res, next) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
      include: {
        igAccount: {
          select: { id: true, igUserId: true, igUsername: true },
        },
      },
    })
    if (!post) return next(notFound('Post not found'))
    res.json(post)
  } catch (err) {
    next(err)
  }
})

// ── CREATE post ───────────────────────────────────────────────────
const createSchema = z.object({
  igAccountId: z.string().uuid('Invalid account ID'),
  type: z.enum(['feed', 'story', 'carousel']),
  caption: z.string().max(2200).optional().default(''),
  hashtags: z.array(z.string().max(100)).max(30).optional().default([]),
  imageUrls: z.array(z.string().url()).min(1, 'At least one image required').max(10),
  scheduledAt: z.string().datetime('Invalid datetime — use ISO 8601 format'),
  method: z.enum(['api', 'reminder']).default('api'),
})

postsRouter.post('/', validate(createSchema), async (req, res, next) => {
  try {
    const account = await prisma.iGAccount.findFirst({
      where: { id: req.body.igAccountId, userId: req.user!.id },
    })
    if (!account) return next(badRequest('Instagram account not found or not yours'))

    const post = await prisma.post.create({
      data: {
        ...req.body,
        hashtags: JSON.stringify(req.body.hashtags ?? []),
        imageUrls: JSON.stringify(req.body.imageUrls ?? []),
        userId: req.user!.id,
        status: 'scheduled',
        scheduledAt: new Date(req.body.scheduledAt),
      },
    })

    res.status(201).json(post)
  } catch (err) {
    next(err)
  }
})

// ── CREATE post (alias: /create) ──────────────────────────────────
postsRouter.post('/create', validate(createSchema), async (req, res, next) => {
  try {
    const account = await prisma.iGAccount.findFirst({
      where: { id: req.body.igAccountId, userId: req.user!.id },
    })
    if (!account) return next(badRequest('Instagram account not found or not yours'))

    const post = await prisma.post.create({
      data: {
        ...req.body,
        hashtags: JSON.stringify(req.body.hashtags ?? []),
        imageUrls: JSON.stringify(req.body.imageUrls ?? []),
        userId: req.user!.id,
        status: 'scheduled',
        scheduledAt: new Date(req.body.scheduledAt),
      },
    })

    res.status(201).json(post)
  } catch (err) {
    next(err)
  }
})

// ── UPDATE post (PATCH) ──────────────────────────────────────────
const updateSchema = z.object({
  caption: z.string().max(2200).optional(),
  hashtags: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['draft', 'scheduled']).optional(),
}).partial()

postsRouter.patch('/:id', validate(updateSchema), async (req, res, next) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    })
    if (!post) return next(notFound('Post not found'))
    if (post.status !== 'scheduled' && post.status !== 'draft') {
      return next(badRequest('Can only edit posts with status "scheduled" or "draft"'))
    }

    const updated = await prisma.post.update({
      where: { id: String(req.params.id) },
      data: {
        ...req.body,
        ...(req.body.hashtags ? { hashtags: JSON.stringify(req.body.hashtags) } : {}),
        ...(req.body.scheduledAt ? { scheduledAt: new Date(req.body.scheduledAt) } : {}),
      },
      include: {
        igAccount: {
          select: { id: true, igUserId: true, igUsername: true },
        },
      },
    })
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// ── UPDATE post (PUT alias — same logic as PATCH) ─────────────────
postsRouter.put('/:id', validate(updateSchema), async (req, res, next) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    })
    if (!post) return next(notFound('Post not found'))
    if (post.status !== 'scheduled' && post.status !== 'draft') {
      return next(badRequest('Can only edit posts with status "scheduled" or "draft"'))
    }

    const updated = await prisma.post.update({
      where: { id: String(req.params.id) },
      data: {
        ...req.body,
        ...(req.body.hashtags ? { hashtags: JSON.stringify(req.body.hashtags) } : {}),
        ...(req.body.scheduledAt ? { scheduledAt: new Date(req.body.scheduledAt) } : {}),
      },
      include: {
        igAccount: {
          select: { id: true, igUserId: true, igUsername: true },
        },
      },
    })
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// ── DELETE post (soft — only scheduled posts) ─────────────────────
postsRouter.delete('/:id', async (req, res, next) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    })
    if (!post) return next(notFound('Post not found'))
    if (post.status !== 'scheduled' && post.status !== 'draft') {
      return next(badRequest('Can only delete posts with status "scheduled" or "draft"'))
    }

    await prisma.post.update({
      where: { id: String(req.params.id) },
      data: { status: 'deleted' },
    })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})
