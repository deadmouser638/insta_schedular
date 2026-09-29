const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')

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

// Root Route - Full SEO HTML & JSON metadata
app.get('/', (req, res) => {
  const isHtml = req.headers.accept?.includes('text/html')
  const metadata = {
    name: 'IG Scheduler Pro API',
    version: '1.0.0',
    status: 'online',
    description: 'Automated Instagram content scheduling backend API platform.',
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
  <meta property="og:title" content="IG Scheduler Pro API" />
  <meta property="og:description" content="Automated Instagram content scheduling backend API platform." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://insta-schedular-api.vercel.app" />
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #f4f4f5; padding: 2rem; margin: 0; }
    .card { max-width: 700px; margin: 2rem auto; background: #18181b; border: 1px solid #27272a; padding: 2rem; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    h1 { color: #a855f7; margin-top: 0; }
    .badge { display: inline-block; background: #22c55e20; color: #4ade80; border: 1px solid #22c55e40; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 600; margin-bottom: 1rem; }
    pre { background: #09090b; padding: 1rem; border-radius: 0.5rem; color: #e4e4e7; border: 1px solid #27272a; overflow-x: auto; }
    a { color: #c084fc; text-decoration: none; }
    a:hover { text-decoration: underline; }
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
  res.json({ status: 'ok', timestamp: new Date().toISOString(), environment: 'production' })
})

app.get('/api/seo', (_req, res) => {
  res.json({
    openGraph: {
      title: 'IG Scheduler Pro API',
      type: 'website',
      url: 'https://insta-schedular-api.vercel.app',
      description: 'Automated Instagram content scheduling platform API.'
    },
    twitter: {
      card: 'summary_large_image',
      site: '@igscheduler',
      creator: '@igscheduler'
    },
    sitemap: 'https://insta-schedular-api.vercel.app/sitemap.xml',
    robots: 'https://insta-schedular-api.vercel.app/robots.txt'
  })
})

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  res.json({
    accessToken: 'dev-jwt-token-sample',
    user: { id: 'dev-user-id', email: req.body?.email || 'dev@example.com', name: 'Dev User' }
  })
})

app.post('/api/auth/register', (req, res) => {
  res.status(201).json({
    user: { id: 'dev-user-id', email: req.body?.email || 'dev@example.com', name: req.body?.name || 'Dev User' }
  })
})

// Accounts endpoints
app.get('/api/accounts', (_req, res) => {
  res.json([])
})

app.get('/api/instagram/accounts', (_req, res) => {
  res.json([])
})

// Posts endpoints
app.get('/api/posts', (_req, res) => {
  res.json([])
})

app.post('/api/posts', (req, res) => {
  res.status(201).json({ id: 'post-' + Date.now(), status: 'scheduled', ...req.body })
})

// Captions endpoint
app.post('/api/captions/generate', (req, res) => {
  res.json({
    caption: '🚀 Elevating social media automation with IG Scheduler Pro! ✨',
    hashtags: ['#InstagramScheduler', '#SocialMedia', '#Automation']
  })
})

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

module.exports = app
