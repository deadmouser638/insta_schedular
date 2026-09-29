import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'

import { authRouter } from '../apps/api/src/routes/auth'
import { postsRouter } from '../apps/api/src/routes/posts'
import { publishRouter } from '../apps/api/src/routes/publish'
import { accountsRouter } from '../apps/api/src/routes/accounts'
import { captionsRouter } from '../apps/api/src/routes/captions'
import { uploadsRouter } from '../apps/api/src/routes/uploads'
import { settingsRouter } from '../apps/api/src/routes/settings'
import { instagramRouter } from '../apps/api/src/routes/instagram'
import { errorHandler } from '../apps/api/src/middleware/errorHandler'

const app = express()

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(cookieParser())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  const isHtml = req.headers.accept?.includes('text/html')

  const metadata = {
    name: 'IG Scheduler Pro API',
    version: '1.0.0',
    status: 'online',
    description: 'Automated Instagram post, reel, carousel, and story scheduling backend engine.',
    website: 'https://insta-schedular-api.vercel.app',
    endpoints: {
      health: '/api/health',
      seo: '/api/seo',
      auth: '/api/auth',
      accounts: '/api/accounts',
      posts: '/api/posts',
      captions: '/api/captions',
      uploads: '/api/uploads',
      settings: '/api/settings',
      instagram: '/api/instagram'
    }
  }

  if (isHtml) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IG Scheduler Pro API</title>
  <meta name="description" content="Automated Instagram content scheduling backend API platform.">
  <style>
    body { font-family: system-ui, sans-serif; background: #09090b; color: #f4f4f5; padding: 2rem; }
    .card { max-width: 700px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; padding: 2rem; border-radius: 1rem; }
    h1 { color: #a855f7; margin-top: 0; }
    .badge { background: #22c55e20; color: #4ade80; border: 1px solid #22c55e40; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600; }
    pre { background: #09090b; padding: 1rem; border-radius: 0.5rem; color: #e4e4e7; border: 1px solid #27272a; overflow-x: auto; }
    a { color: #c084fc; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">🚀 API Online v1.0.0</span>
    <h1>IG Scheduler Pro API</h1>
    <p>Automated Instagram post, reel, carousel, and story scheduling backend API engine.</p>
    <h3>Endpoints Catalog</h3>
    <pre><code>${JSON.stringify(metadata.endpoints, null, 2)}</code></pre>
    <p>Check health at <a href="/api/health">/api/health</a> or SEO schema at <a href="/api/seo">/api/seo</a>.</p>
  </div>
</body>
</html>`)
    return
  }

  res.json(metadata)
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/seo', (_req, res) => {
  res.json({
    openGraph: {
      title: 'IG Scheduler Pro API',
      type: 'website',
      url: 'https://insta-schedular-api.vercel.app',
      description: 'Automated Instagram content scheduling platform API.'
    },
    sitemap: 'https://insta-schedular-api.vercel.app/sitemap.xml',
    robots: 'https://insta-schedular-api.vercel.app/robots.txt'
  })
})

app.use('/api/auth', authRouter)
app.use('/api/instagram', instagramRouter)
app.use('/api/accounts', accountsRouter)
app.use('/api/posts', publishRouter)
app.use('/api/posts', postsRouter)
app.use('/api/captions', captionsRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/settings', settingsRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

app.use(errorHandler)

export default app
