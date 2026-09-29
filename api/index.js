// Register ts-node for on-the-fly TypeScript compilation on Vercel
try {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs',
      esModuleInterop: true,
    }
  })
} catch (e) {
  console.warn('[ts-node]:', e?.message || e)
}

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

// Root Endpoint - Direct HTTP metadata response
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

// Static explicit requirements for Vercel NFT bundler
try {
  const { authRouter } = require('../apps/api/src/routes/auth')
  if (authRouter) app.use('/api/auth', authRouter)
} catch (e) { console.error('[Route Auth Error]:', e?.message || e) }

try {
  const { instagramRouter } = require('../apps/api/src/routes/instagram')
  if (instagramRouter) app.use('/api/instagram', instagramRouter)
} catch (e) { console.error('[Route Instagram Error]:', e?.message || e) }

try {
  const { accountsRouter } = require('../apps/api/src/routes/accounts')
  if (accountsRouter) app.use('/api/accounts', accountsRouter)
} catch (e) { console.error('[Route Accounts Error]:', e?.message || e) }

try {
  const { publishRouter } = require('../apps/api/src/routes/publish')
  if (publishRouter) app.use('/api/posts', publishRouter)
} catch (e) { console.error('[Route Publish Error]:', e?.message || e) }

try {
  const { postsRouter } = require('../apps/api/src/routes/posts')
  if (postsRouter) app.use('/api/posts', postsRouter)
} catch (e) { console.error('[Route Posts Error]:', e?.message || e) }

try {
  const { captionsRouter } = require('../apps/api/src/routes/captions')
  if (captionsRouter) app.use('/api/captions', captionsRouter)
} catch (e) { console.error('[Route Captions Error]:', e?.message || e) }

try {
  const { uploadsRouter } = require('../apps/api/src/routes/uploads')
  if (uploadsRouter) app.use('/api/uploads', uploadsRouter)
} catch (e) { console.error('[Route Uploads Error]:', e?.message || e) }

try {
  const { settingsRouter } = require('../apps/api/src/routes/settings')
  if (settingsRouter) app.use('/api/settings', settingsRouter)
} catch (e) { console.error('[Route Settings Error]:', e?.message || e) }

try {
  const { errorHandler } = require('../apps/api/src/middleware/errorHandler')
  if (errorHandler) app.use(errorHandler)
} catch (e) { console.error('[Middleware ErrorHandler Error]:', e?.message || e) }

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

module.exports = app
