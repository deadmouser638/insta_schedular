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
  origin: process.env.FRONTEND_URL ?? '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Serve uploaded files statically ───────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// ── Root Endpoint with full HTML/JSON SEO Metadata ────────────────
app.get('/', (req, res) => {
  const isHtml = req.headers.accept?.includes('text/html')

  const seoMetaData = {
    name: 'IG Scheduler Pro API',
    version: '1.0.0',
    status: 'online',
    description: 'Automated Instagram post, reel, carousel, and story scheduling backend engine and social media publishing API.',
    website: 'https://insta-schedular-api.vercel.app',
    documentation: 'https://insta-schedular-api.vercel.app/api/health',
    endpoints: {
      health: '/api/health',
      schedulerStatus: '/api/scheduler/status',
      seoMetadata: '/api/seo',
      auth: '/api/auth',
      accounts: '/api/accounts',
      posts: '/api/posts',
      captions: '/api/captions',
      uploads: '/api/uploads',
      settings: '/api/settings',
      instagram: '/api/instagram'
    },
    schema: {
      '@context': 'https://schema.org',
      '@type': 'WebAPI',
      'name': 'IG Scheduler Pro API',
      'description': 'REST API for automated Instagram scheduling, media uploading, and account management.',
      'url': 'https://insta-schedular-api.vercel.app',
      'termsOfService': 'https://insta-schedular-api.vercel.app/terms',
      'provider': {
        '@type': 'Organization',
        'name': 'IG Scheduler Pro',
        'url': 'https://insta-schedular-api.vercel.app'
      }
    }
  }

  if (isHtml) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>IG Scheduler Pro API - Backend Server</title>
  <meta name="description" content="Automated Instagram post, reel, carousel, and story scheduling backend API engine." />
  <meta property="og:title" content="IG Scheduler Pro API" />
  <meta property="og:description" content="Automated Instagram content scheduling platform API." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://insta-schedular-api.vercel.app" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="IG Scheduler Pro API" />
  <meta name="twitter:description" content="Automated Instagram post and media publishing API." />
  <script type="application/ld+json">
  ${JSON.stringify(seoMetaData.schema, null, 2)}
  </script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; margin: 0; padding: 2rem; }
    .container { max-width: 800px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    h1 { color: #a855f7; margin-top: 0; }
    .badge { display: inline-block; background: #22c55e20; color: #4ade80; border: 1px solid #22c55e40; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem; }
    pre { background: #09090b; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; color: #e4e4e7; border: 1px solid #27272a; }
    a { color: #c084fc; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">🚀 API Online v1.0.0</span>
    <h1>IG Scheduler Pro Backend API</h1>
    <p>Automated Instagram post, reel, carousel, and story scheduling backend engine and social media publishing API.</p>
    <h2>Endpoints Catalog</h2>
    <pre><code>${JSON.stringify(seoMetaData.endpoints, null, 2)}</code></pre>
    <p>Check health status at <a href="/api/health">/api/health</a> or full SEO schema at <a href="/api/seo">/api/seo</a>.</p>
  </div>
</body>
</html>`)
    return
  }

  res.json(seoMetaData)
})

// ── Dedicated SEO Formats & JSON-LD Metadata Endpoint ─────────────
app.get('/api/seo', (_req, res) => {
  res.json({
    openGraph: {
      title: 'IG Scheduler Pro API',
      type: 'website',
      url: 'https://insta-schedular-api.vercel.app',
      image: 'https://insta-schedular-api.vercel.app/og-image.png',
      description: 'Automated Instagram content scheduling & social media publishing API platform.',
      siteName: 'IG Scheduler Pro'
    },
    twitter: {
      card: 'summary_large_image',
      site: '@igscheduler',
      creator: '@igscheduler',
      title: 'IG Scheduler Pro API',
      description: 'Automated Instagram content scheduling platform API.'
    },
    dublinCore: {
      'DC.title': 'IG Scheduler Pro API',
      'DC.description': 'Instagram Content Scheduling API Engine',
      'DC.publisher': 'IG Scheduler Pro',
      'DC.format': 'application/json',
      'DC.language': 'en'
    },
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebAPI',
      'name': 'IG Scheduler Pro API',
      'url': 'https://insta-schedular-api.vercel.app',
      'description': 'REST API engine for scheduled publishing of Instagram media',
      'documentation': 'https://insta-schedular-api.vercel.app/api/health'
    },
    sitemap: 'https://insta-schedular-api.vercel.app/sitemap.xml',
    robots: 'https://insta-schedular-api.vercel.app/robots.txt'
  })
})

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

    res.json({ message: 'Publishing started', postId: post.id })

    publishPostById(post.id).catch((err) => {
      console.error(`Manual publish failed for post ${post.id}:`, err)
    })
  } catch (err) {
    next(err)
  }
})

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',      authRouter)
app.use('/api/instagram', instagramRouter)
app.use('/api/accounts',  accountsRouter)
app.use('/api/posts',     publishRouter)
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
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 API running → http://localhost:${PORT}`)
    console.log(`   Health check → http://localhost:${PORT}/api/health\n`)
    startScheduler()
  })
}

export { app }
export default app
