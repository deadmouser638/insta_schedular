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

module.exports = (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const url = req.url || '/'

  // Instagram Auth URL
  if (url.includes('/instagram/auth-url')) {
    const appId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID || process.env.FACEBOOK_APP_ID
    const redirectUri = process.env.META_REDIRECT_URI || process.env.INSTAGRAM_REDIRECT_URI || 'https://insta-schedular-api.vercel.app/connect?success=true&count=1'
    if (appId) {
      const scopes = 'public_profile,instagram_basic,instagram_content_publish,instagram_manage_insights,pages_show_list,pages_read_engagement,business_management'
      const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=dev-user-id`
      return res.status(200).json({ authUrl })
    }
    return res.status(200).json({ authUrl: 'https://insta-schedular-api.vercel.app/connect?success=true&count=1' })
  }

  // Instagram Accounts listing & deletion
  if (url.includes('/instagram/accounts') || url.includes('/accounts')) {
    if (req.method === 'DELETE') {
      const parts = url.split('?')[0].split('/')
      const id = parts[parts.length - 1]
      connectedAccounts = connectedAccounts.filter(a => a.id !== id)
      return res.status(200).json({ message: 'Account disconnected successfully 👋' })
    }
    return res.status(200).json(connectedAccounts)
  }

  // Manual Instagram Connection
  if (url.includes('/instagram/connect-manual')) {
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
    return res.status(200).json({ message: 'Instagram Business Account connected successfully! 🎉', account: newAccount })
  }

  // Health check
  if (url.includes('/health')) {
    return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), environment: 'production' })
  }

  // SEO metadata
  if (url.includes('/seo')) {
    return res.status(200).json({
      openGraph: {
        title: 'IG Scheduler Pro API',
        type: 'website',
        url: 'https://insta-schedular-api.vercel.app',
        description: 'Automated Instagram content scheduling platform API.'
      }
    })
  }

  // Auth endpoints
  if (url.includes('/auth/login') || url.includes('/auth/register')) {
    return res.status(200).json({
      accessToken: 'dev-jwt-token-sample',
      user: { id: 'dev-user-id', email: req.body?.email || 'deadmouser638@example.com', name: 'deadmouser638' }
    })
  }

  // Posts queue
  if (url.includes('/posts')) {
    if (req.method === 'POST') {
      const newPost = { id: 'post-' + Date.now(), status: 'scheduled', createdAt: new Date().toISOString(), ...(req.body || {}) }
      posts.unshift(newPost)
      return res.status(201).json(newPost)
    }
    return res.status(200).json(posts)
  }

  // Captions AI generator
  if (url.includes('/captions/generate')) {
    return res.status(200).json({
      caption: '🚀 Elevating social media automation with IG Scheduler Pro! ✨',
      hashtags: ['#InstagramScheduler', '#SocialMedia', '#Automation', '#IGScheduler']
    })
  }

  // Default API metadata catalog
  return res.status(200).json({
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
}
