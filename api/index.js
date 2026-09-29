// Register ts-node for on-the-fly TypeScript module resolution in Node.js
try {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs',
      esModuleInterop: true,
    }
  })
} catch (e) {
  console.warn('[ts-node] Registration note:', e?.message || e)
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

// Root Route - Pure HTTP metadata response
app.get('/', (_req, res) => {
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

function loadModule(relativePath) {
  try {
    return require(`../apps/api/dist/${relativePath}`)
  } catch (distErr) {
    try {
      return require(`../apps/api/src/${relativePath}`)
    } catch (srcErr) {
      console.error(`[LoadModule Error] ${relativePath}:`, srcErr?.message || srcErr)
      return {}
    }
  }
}

// Safely require routes
try {
  const { authRouter } = loadModule('routes/auth')
  const { postsRouter } = loadModule('routes/posts')
  const { publishRouter } = loadModule('routes/publish')
  const { accountsRouter } = loadModule('routes/accounts')
  const { captionsRouter } = loadModule('routes/captions')
  const { uploadsRouter } = loadModule('routes/uploads')
  const { settingsRouter } = loadModule('routes/settings')
  const { instagramRouter } = loadModule('routes/instagram')
  const { errorHandler } = loadModule('middleware/errorHandler')

  if (authRouter) app.use('/api/auth', authRouter)
  if (instagramRouter) app.use('/api/instagram', instagramRouter)
  if (accountsRouter) app.use('/api/accounts', accountsRouter)
  if (publishRouter) app.use('/api/posts', publishRouter)
  if (postsRouter) app.use('/api/posts', postsRouter)
  if (captionsRouter) app.use('/api/captions', captionsRouter)
  if (uploadsRouter) app.use('/api/uploads', uploadsRouter)
  if (settingsRouter) app.use('/api/settings', settingsRouter)
  if (errorHandler) app.use(errorHandler)
} catch (err) {
  console.error('[Vercel Boot Error]:', err)
}

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

module.exports = app
