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

// In-memory data store for serverless demo & preview mode
let connectedAccounts = [
  {
    id: 'acc-demo-1',
    igUserId: '17841400000000001',
    igUsername: 'igscheduler_official',
    tokenExpiresAt: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    daysUntilExpiry: 55,
    isExpired: false,
    isExpiringSoon: false,
    status: 'connected'
  }
]

let posts = []

const getMetadata = () => ({
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

// API Catalog Endpoint
app.get(['/', '/api', '/api/'], (req, res) => {
  res.json(getMetadata())
})

app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), environment: 'production' })
})

app.get(['/seo', '/api/seo'], (_req, res) => {
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
app.post(['/auth/login', '/api/auth/login'], (req, res) => {
  res.json({
    accessToken: 'dev-jwt-token-sample',
    user: { id: 'dev-user-id', email: req.body?.email || 'deadmouser638@example.com', name: 'deadmouser638' }
  })
})

app.post(['/auth/register', '/api/auth/register'], (req, res) => {
  res.status(201).json({
    user: { id: 'dev-user-id', email: req.body?.email || 'deadmouser638@example.com', name: req.body?.name || 'deadmouser638' }
  })
})

// ── Instagram OAuth & Accounts endpoints ──────────────────────────

// GET /api/instagram/auth-url - Generate Meta OAuth Login URL
app.get(['/instagram/auth-url', '/api/instagram/auth-url'], (req, res) => {
  const appId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID
  const redirectUri = process.env.META_REDIRECT_URI || process.env.INSTAGRAM_REDIRECT_URI || 'https://insta-schedular-api.vercel.app/api/instagram/callback'

  if (appId && redirectUri) {
    const scopes = [
      'public_profile',
      'instagram_basic',
      'instagram_content_publish',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
      'business_management'
    ].join(',')

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      state: 'dev-user-id'
    })

    return res.json({ authUrl: `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}` })
  }

  // Fallback to seamless connection callback when Meta App ID is not configured yet
  const fallbackUrl = `https://insta-schedular-api.vercel.app/connect?success=true&count=1`
  
  // Ensure an account exists in memory
  if (connectedAccounts.length === 0) {
    connectedAccounts.push({
      id: 'acc-' + Date.now(),
      igUserId: '17841400000000001',
      igUsername: 'igscheduler_official',
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      daysUntilExpiry: 60,
      isExpired: false,
      isExpiringSoon: false,
      status: 'connected'
    })
  }

  return res.json({ authUrl: fallbackUrl })
})

// GET /api/accounts & /api/instagram/accounts - List Instagram Accounts
app.get(['/accounts', '/api/accounts', '/instagram/accounts', '/api/instagram/accounts'], (_req, res) => {
  res.json(connectedAccounts)
})

// DELETE /api/accounts/:id - Disconnect Instagram Account
app.delete(['/accounts/:id', '/api/accounts/:id'], (req, res) => {
  const { id } = req.params
  connectedAccounts = connectedAccounts.filter(a => a.id !== id)
  res.json({ message: 'Account disconnected successfully 👋' })
})

// POST /api/instagram/connect-manual - Manual Connection with Access Token
app.post(['/instagram/connect-manual', '/api/instagram/connect-manual'], (req, res) => {
  const { pageAccessToken, igBusinessAccountId } = req.body

  if (!pageAccessToken || !igBusinessAccountId) {
    return res.status(400).json({ message: 'Both Page Access Token and Instagram Business Account ID are required' })
  }

  const newAccount = {
    id: 'acc-' + Date.now(),
    igUserId: igBusinessAccountId,
    igUsername: 'ig_account_' + igBusinessAccountId.slice(-4),
    tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    daysUntilExpiry: 60,
    isExpired: false,
    isExpiringSoon: false,
    status: 'connected'
  }

  connectedAccounts.unshift(newAccount)

  res.json({ message: `Instagram Business Account connected successfully! 🎉`, account: newAccount })
})

// ── Posts endpoints ───────────────────────────────────────────────
app.get(['/posts', '/api/posts'], (_req, res) => {
  res.json(posts)
})

app.post(['/posts', '/api/posts'], (req, res) => {
  const newPost = {
    id: 'post-' + Date.now(),
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...req.body
  }
  posts.unshift(newPost)
  res.status(201).json(newPost)
})

// ── Captions endpoint ──────────────────────────────────────────────
app.post(['/captions/generate', '/api/captions/generate'], (_req, res) => {
  res.json({
    caption: '🚀 Elevating social media automation with IG Scheduler Pro! ✨',
    hashtags: ['#InstagramScheduler', '#SocialMedia', '#Automation', '#IGScheduler']
  })
})

// 404 Handler for unrecognized API routes
app.use((_req, res) => {
  res.status(404).json({ error: 'API route not found' })
})

module.exports = app
