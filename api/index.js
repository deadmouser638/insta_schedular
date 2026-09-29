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

// API Catalog Endpoint (handles /api or root of API function)
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
    user: { id: 'dev-user-id', email: req.body?.email || 'dev@example.com', name: 'Dev User' }
  })
})

app.post(['/auth/register', '/api/auth/register'], (req, res) => {
  res.status(201).json({
    user: { id: 'dev-user-id', email: req.body?.email || 'dev@example.com', name: req.body?.name || 'Dev User' }
  })
})

// Accounts endpoints
app.get(['/accounts', '/api/accounts', '/instagram/accounts', '/api/instagram/accounts'], (_req, res) => {
  res.json([])
})

// Posts endpoints
app.get(['/posts', '/api/posts'], (_req, res) => {
  res.json([])
})

app.post(['/posts', '/api/posts'], (req, res) => {
  res.status(201).json({ id: 'post-' + Date.now(), status: 'scheduled', ...req.body })
})

// Captions endpoint
app.post(['/captions/generate', '/api/captions/generate'], (_req, res) => {
  res.json({
    caption: '🚀 Elevating social media automation with IG Scheduler Pro! ✨',
    hashtags: ['#InstagramScheduler', '#SocialMedia', '#Automation']
  })
})

// 404 Handler for unrecognized API routes
app.use((_req, res) => {
  res.status(404).json({ error: 'API route not found' })
})

module.exports = app
