import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import path from 'path'

import { authRouter } from './routes/auth'
import { postsRouter } from './routes/posts'
import { publishRouter } from './routes/publish'
import { accountsRouter } from './routes/accounts'
import { captionsRouter } from './routes/captions'
import { uploadsRouter } from './routes/uploads'
import { settingsRouter } from './routes/settings'
import { instagramRouter } from './routes/instagram'
import { errorHandler } from './middleware/errorHandler'
import { startScheduler, getSchedulerStatus, publishPostById } from './scheduler'
import { authMiddleware } from './middleware/auth'
import { prisma } from './lib/prisma'

const app = express()

// ── Security & parsing ────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,            // REQUIRED — allows cookies to be sent cross-origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Serve uploaded files statically ───────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// ── Health check (no auth) ────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  })
})

// ── Scheduler status (no auth — lightweight) ──────────────────────
app.get('/api/scheduler/status', (_req, res) => {
  res.json(getSchedulerStatus())
})

// ── Manual Publish Now ────────────────────────────────────────────
app.post('/api/posts/:id/publish-now', authMiddleware, async (req, res, next) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    })
    if (!post) {
      res.status(404).json({ error: 'Post not found' })
      return
    }
    if (post.status !== 'scheduled' && post.status !== 'draft') {
      res.status(400).json({ error: `Cannot publish a post with status "${post.status}"` })
      return
    }

    // Publish asynchronously — respond immediately
    res.json({ message: 'Publishing started', postId: post.id })

    // Fire and forget — the scheduler's publish function handles status updates
    publishPostById(post.id).catch((err) => {
      console.error(`Manual publish failed for post ${post.id}:`, err)
    })
  } catch (err) {
    next(err)
  }
})

// ── Routes ────────────────────────────────────────────────────────
// NOTE: Order matters. More specific paths first.
app.use('/api/auth',      authRouter)
app.use('/api/instagram', instagramRouter)
app.use('/api/accounts',  accountsRouter)
app.use('/api/posts',     publishRouter)   // /posts/:id/publish BEFORE /posts CRUD
app.use('/api/posts',     postsRouter)
app.use('/api/captions',  captionsRouter)
app.use('/api/uploads',   uploadsRouter)
app.use('/api/settings',  settingsRouter)

// ── 404 handler ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ── Global error handler (MUST be last) ──────────────────────────
app.use(errorHandler)

// ── Start ─────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3001)
app.listen(PORT, () => {
  console.log(`\n🚀 API running → http://localhost:${PORT}`)
  console.log(`   Health check → http://localhost:${PORT}/api/health\n`)

  // Start the background post scheduler
  startScheduler()
})

export { app }
