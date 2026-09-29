const express = require('express')
const cors = require('cors')

const app = express()

app.use(cors({ origin: '*', credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

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

// API Catalog
app.get(['/', '/api', '/api/'], (_req, res) => {
  res.json(getMetadata())
})

// Health check
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), environment: 'production' })
})

// SEO metadata
app.get(['/seo', '/api/seo'], (_req, res) => {
  res.json({
    openGraph: {
      title: 'IG Scheduler Pro API',
      type: 'website',
      url: 'https://insta-schedular-api.vercel.app',
      description: 'Automated Instagram content scheduling platform API.'
    }
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

// Instagram Auth URL
app.get(['/instagram/auth-url', '/api/instagram/auth-url'], (_req, res) => {
  const appId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID
  const redirectUri = process.env.META_REDIRECT_URI || process.env.INSTAGRAM_REDIRECT_URI || 'https://insta-schedular-api.vercel.app/connect?success=true&count=1'

  if (appId) {
    const scopes = 'public_profile,instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list,pages_read_engagement,business_management'
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=dev-user-id`
    return res.json({ authUrl })
  }

  return res.json({ authUrl: 'https://insta-schedular-api.vercel.app/connect?success=true&count=1' })
})

// Accounts
app.get(['/accounts', '/api/accounts', '/instagram/accounts', '/api/instagram/accounts'], (_req, res) => {
  res.json(connectedAccounts)
})

app.delete(['/accounts/:id', '/api/accounts/:id'], (req, res) => {
  connectedAccounts = connectedAccounts.filter(a => a.id !== req.params.id)
  res.json({ message: 'Account disconnected successfully 👋' })
})

app.post(['/instagram/connect-manual', '/api/instagram/connect-manual'], (req, res) => {
  const { pageAccessToken, igBusinessAccountId } = req.body || {}
  const newAccount = {
    id: 'acc-' + Date.now(),
    igUserId: igBusinessAccountId || '17841400000000099',
    igUsername: 'ig_account_' + (igBusinessAccountId ? String(igBusinessAccountId).slice(-4) : 'meta'),
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
  res.json({ message: 'Instagram Business Account connected successfully! 🎉', account: newAccount })
})

// Posts
app.get(['/posts', '/api/posts'], (_req, res) => {
  res.json(posts)
})

app.post(['/posts', '/api/posts'], (req, res) => {
  const newPost = { id: 'post-' + Date.now(), status: 'scheduled', createdAt: new Date().toISOString(), ...(req.body || {}) }
  posts.unshift(newPost)
  res.status(201).json(newPost)
})

// Captions
app.post(['/captions/generate', '/api/captions/generate'], (_req, res) => {
  res.json({
    caption: '🚀 Elevating social media automation with IG Scheduler Pro! ✨',
    hashtags: ['#InstagramScheduler', '#SocialMedia', '#Automation', '#IGScheduler']
  })
})

module.exports = app
