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

// Root Route - Pure HTTP metadata response
app.get('/', (_req, res) => {
  res.json({
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
  })
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

// Safely require routes
try {
  const { authRouter } = require('../apps/api/src/routes/auth')
  const { postsRouter } = require('../apps/api/src/routes/posts')
  const { publishRouter } = require('../apps/api/src/routes/publish')
  const { accountsRouter } = require('../apps/api/src/routes/accounts')
  const { captionsRouter } = require('../apps/api/src/routes/captions')
  const { uploadsRouter } = require('../apps/api/src/routes/uploads')
  const { settingsRouter } = require('../apps/api/src/routes/settings')
  const { instagramRouter } = require('../apps/api/src/routes/instagram')
  const { errorHandler } = require('../apps/api/src/middleware/errorHandler')

  app.use('/api/auth', authRouter)
  app.use('/api/instagram', instagramRouter)
  app.use('/api/accounts', accountsRouter)
  app.use('/api/posts', publishRouter)
  app.use('/api/posts', postsRouter)
  app.use('/api/captions', captionsRouter)
  app.use('/api/uploads', uploadsRouter)
  app.use('/api/settings', settingsRouter)
  app.use(errorHandler)
} catch (err) {
  console.error('[Vercel Boot Error]:', err)
  app.use('/api/*', (_req, res) => {
    res.status(500).json({ error: 'Serverless Function Boot Error', details: err?.message || String(err) })
  })
}

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

module.exports = app
