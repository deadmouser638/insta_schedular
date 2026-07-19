import { Router } from 'express'
import axios from 'axios'
import { addDays } from 'date-fns'
import { prisma } from '../lib/prisma'
import { encrypt } from '../lib/crypto'
import { authMiddleware } from '../middleware/auth'
import { badRequest } from '../lib/errors'

export const instagramRouter = Router()

// All routes require authentication
instagramRouter.use(authMiddleware)

const GRAPH = 'https://graph.facebook.com/v19.0'

// ── Required scopes for Instagram Graph API ───────────────────────
const SCOPES = [
  'public_profile',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'pages_show_list',
  'pages_read_engagement',
  'business_management',
].join(',')

// ── Helper: safely call Graph API and log everything ──────────────
async function graphGet(url: string, params: Record<string, string>, label: string) {
  console.log(`\n   📡 ${label}`)
  console.log(`      URL: ${url}`)
  console.log(`      Params: ${JSON.stringify({ ...params, access_token: '***' })}`)
  try {
    const res = await axios.get(url, { params, timeout: 15000 })
    console.log(`      ✅ Response:`, JSON.stringify(res.data, null, 2))
    return { ok: true as const, data: res.data }
  } catch (err: any) {
    const errData = err.response?.data || { message: err.message }
    console.error(`      ❌ Error:`, JSON.stringify(errData, null, 2))
    return { ok: false as const, error: errData }
  }
}

// ──────────────────────────────────────────────────────────────────
// GET /api/instagram/auth-url
// Returns the Meta OAuth login URL for the frontend to redirect to
// ──────────────────────────────────────────────────────────────────
instagramRouter.get('/auth-url', (req, res, next) => {
  try {
    const appId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID
    const redirectUri = process.env.META_REDIRECT_URI || process.env.INSTAGRAM_REDIRECT_URI

    if (!appId || !redirectUri) {
      return next(badRequest('META_APP_ID and META_REDIRECT_URI must be set in .env'))
    }

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: SCOPES,
      response_type: 'code',
      state: req.user!.id,
    })

    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`

    res.json({ authUrl })
  } catch (err) {
    next(err)
  }
})

// ──────────────────────────────────────────────────────────────────
// GET /api/instagram/callback
// Meta redirects here after the user authorizes the app.
// Tries MULTIPLE strategies to find the IG business account,
// because /me/accounts is limited in development mode.
// ──────────────────────────────────────────────────────────────────
instagramRouter.get('/callback', async (req, res, next) => {
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

  try {
    const { code, state, error: oauthError } = req.query

    // ── Handle OAuth denial ────────────────────────────────────────
    if (oauthError) {
      return res.redirect(`${frontendUrl}/connect?error=${encodeURIComponent(String(oauthError))}`)
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${frontendUrl}/connect?error=${encodeURIComponent('No authorization code received')}`)
    }

    const appId = (process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID)!
    const appSecret = (process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET)!
    const redirectUri = (process.env.META_REDIRECT_URI || process.env.INSTAGRAM_REDIRECT_URI)!

    const userId = (state as string) || req.user!.id

    console.log('\n══════════════════════════════════════════════════')
    console.log('🔑 Instagram OAuth Callback Started')
    console.log('══════════════════════════════════════════════════')
    console.log(`   App ID: ${appId}`)
    console.log(`   Redirect URI: ${redirectUri}`)
    console.log(`   Scopes requested: ${SCOPES}`)

    // ── Step 1: Exchange code for short-lived token ────────────────
    let shortLivedToken: string
    try {
      console.log('\n── STEP 1: Exchange code for short-lived token ──')
      const tokenRes = await axios.post(
        `${GRAPH}/oauth/access_token`,
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        }
      )
      shortLivedToken = tokenRes.data.access_token
      console.log('   ✅ Short-lived token obtained')
    } catch (err: any) {
      const fullError = err.response?.data || err.message
      console.error('   ❌ Token exchange FAILED:')
      console.error('   ', JSON.stringify(fullError, null, 2))
      const msg = err.response?.data?.error?.message || err.message
      return res.redirect(`${frontendUrl}/connect?error=${encodeURIComponent('Token exchange failed: ' + msg)}`)
    }

    // ── Step 2: Exchange for long-lived token (60 days) ────────────
    let longLivedToken: string
    let expiresIn: number
    try {
      console.log('\n── STEP 2: Exchange for long-lived token ──')
      const llRes = await axios.post(
        `${GRAPH}/oauth/access_token`,
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken,
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        }
      )
      longLivedToken = llRes.data.access_token
      expiresIn = llRes.data.expires_in || 5184000
      console.log(`   ✅ Long-lived token obtained (expires in ${Math.floor(expiresIn / 86400)} days)`)
    } catch (err: any) {
      console.error('   ⚠️ Long-lived token exchange failed, using short-lived:')
      console.error('   ', JSON.stringify(err.response?.data || err.message, null, 2))
      longLivedToken = shortLivedToken
      expiresIn = 3600
    }

    // ── Step 3: Debug — identify authenticated user ────────────────
    console.log('\n── STEP 3: Identify authenticated Facebook user ──')
    let fbUserId = ''
    const meResult = await graphGet(`${GRAPH}/me`, {
      access_token: longLivedToken,
      fields: 'id,name,email',
    }, 'GET /me')
    if (meResult.ok) {
      fbUserId = meResult.data.id
    }

    // ══════════════════════════════════════════════════════════════
    // TRY MULTIPLE STRATEGIES to find the IG Business Account
    // This handles development mode where /me/accounts may be empty
    // ══════════════════════════════════════════════════════════════

    let igUserId: string | null = null
    let igUsername: string | null = null
    let workingToken: string = longLivedToken // token that can manage the IG account

    // ── Strategy A: Standard /me/accounts (Facebook Pages) ────────
    console.log('\n── STRATEGY A: GET /me/accounts (Facebook Pages) ──')
    const pagesResult = await graphGet(`${GRAPH}/me/accounts`, {
      access_token: longLivedToken,
      fields: 'id,name,access_token,instagram_business_account',
      limit: '100',
    }, 'GET /me/accounts')

    if (pagesResult.ok) {
      const pages = pagesResult.data.data || []
      console.log(`   Found ${pages.length} page(s)`)

      for (const page of pages) {
        // Check if instagram_business_account was included in the response
        if (page.instagram_business_account) {
          igUserId = page.instagram_business_account.id
          workingToken = page.access_token
          console.log(`   🎯 Found IG account ${igUserId} on page "${page.name}" (from inline field)`)
          break
        }

        // Otherwise, query the page directly
        const pageIgResult = await graphGet(`${GRAPH}/${page.id}`, {
          access_token: page.access_token,
          fields: 'instagram_business_account',
        }, `GET /${page.id} (check IG link)`)

        if (pageIgResult.ok && pageIgResult.data.instagram_business_account) {
          igUserId = pageIgResult.data.instagram_business_account.id
          workingToken = page.access_token
          console.log(`   🎯 Found IG account ${igUserId} on page "${page.name}"`)
          break
        }
      }
    }

    // ── Strategy B: Direct /me?fields=instagram_business_account ──
    if (!igUserId) {
      console.log('\n── STRATEGY B: GET /me?fields=instagram_business_account ──')
      const directResult = await graphGet(`${GRAPH}/me`, {
        access_token: longLivedToken,
        fields: 'instagram_business_account',
      }, 'GET /me?fields=instagram_business_account')

      if (directResult.ok && directResult.data.instagram_business_account) {
        igUserId = directResult.data.instagram_business_account.id
        workingToken = longLivedToken
        console.log(`   🎯 Found IG account ${igUserId} directly on user`)
      }
    }

    // ── Strategy C: Try /{user-id}/instagram_accounts ─────────────
    if (!igUserId && fbUserId) {
      console.log('\n── STRATEGY C: GET /{user-id}/instagram_accounts ──')
      const igAccountsResult = await graphGet(`${GRAPH}/${fbUserId}/instagram_accounts`, {
        access_token: longLivedToken,
        fields: 'id,username,name,profile_picture_url',
      }, `GET /${fbUserId}/instagram_accounts`)

      if (igAccountsResult.ok) {
        const igAccounts = igAccountsResult.data.data || []
        if (igAccounts.length > 0) {
          igUserId = igAccounts[0].id
          igUsername = igAccounts[0].username || igAccounts[0].name
          workingToken = longLivedToken
          console.log(`   🎯 Found IG account ${igUserId} (@${igUsername})`)
        }
      }
    }

    // ── Strategy D: Try /me/instagram_accounts ────────────────────
    if (!igUserId) {
      console.log('\n── STRATEGY D: GET /me/instagram_accounts ──')
      const meIgResult = await graphGet(`${GRAPH}/me/instagram_accounts`, {
        access_token: longLivedToken,
        fields: 'id,username,name,profile_picture_url',
      }, 'GET /me/instagram_accounts')

      if (meIgResult.ok) {
        const igAccounts = meIgResult.data.data || []
        if (igAccounts.length > 0) {
          igUserId = igAccounts[0].id
          igUsername = igAccounts[0].username || igAccounts[0].name
          workingToken = longLivedToken
          console.log(`   🎯 Found IG account ${igUserId} (@${igUsername})`)
        }
      }
    }

    // ── Strategy E: Try /me/businesses → owned_pages ──────────────
    if (!igUserId) {
      console.log('\n── STRATEGY E: GET /me/businesses → owned_pages ──')
      const bizResult = await graphGet(`${GRAPH}/me/businesses`, {
        access_token: longLivedToken,
        fields: 'id,name',
      }, 'GET /me/businesses')

      if (bizResult.ok) {
        const businesses = bizResult.data.data || []
        for (const biz of businesses) {
          const ownedPagesResult = await graphGet(`${GRAPH}/${biz.id}/owned_pages`, {
            access_token: longLivedToken,
            fields: 'id,name,access_token,instagram_business_account',
            limit: '100',
          }, `GET /${biz.id}/owned_pages`)

          if (ownedPagesResult.ok) {
            const ownedPages = ownedPagesResult.data.data || []
            for (const page of ownedPages) {
              if (page.instagram_business_account) {
                igUserId = page.instagram_business_account.id
                workingToken = page.access_token || longLivedToken
                console.log(`   🎯 Found IG account ${igUserId} via business "${biz.name}" → page "${page.name}"`)
                break
              }
            }
          }
          if (igUserId) break
        }
      }
    }

    // ── Strategy F: Check if user token itself can access IG ──────
    if (!igUserId) {
      console.log('\n── STRATEGY F: GET /me?fields=accounts{instagram_business_account} ──')
      const nestedResult = await graphGet(`${GRAPH}/me`, {
        access_token: longLivedToken,
        fields: 'accounts{id,name,access_token,instagram_business_account}',
      }, 'GET /me?fields=accounts{nested}')

      if (nestedResult.ok && nestedResult.data.accounts?.data) {
        for (const page of nestedResult.data.accounts.data) {
          if (page.instagram_business_account) {
            igUserId = page.instagram_business_account.id
            workingToken = page.access_token || longLivedToken
            console.log(`   🎯 Found IG account ${igUserId} via nested accounts query`)
            break
          }
        }
      }
    }

    // ══════════════════════════════════════════════════════════════
    // If we STILL have no IG account, give up with a detailed error
    // ══════════════════════════════════════════════════════════════
    if (!igUserId) {
      console.error('\n   ❌ ALL STRATEGIES EXHAUSTED — No IG Business account found')
      console.error('   Possible causes:')
      console.error('   1. IG account is not a Business/Creator account')
      console.error('   2. IG account is not linked to a Facebook Page')
      console.error('   3. App is in dev mode and user is not an admin of the FB Page')
      console.error('   4. Required permissions not approved in Meta Developer Console')
      return res.redirect(
        `${frontendUrl}/connect?error=${encodeURIComponent(
          'Could not find your Instagram Business account. Checklist: (1) Your IG account must be Business or Creator type, (2) It must be linked to a Facebook Page, (3) In dev mode, you must be a Page admin, (4) Make sure you approved all permissions during login.'
        )}`
      )
    }

    // ── Fetch IG username if we don't have it yet ─────────────────
    if (!igUsername) {
      console.log('\n── Fetching IG account details ──')
      const detailResult = await graphGet(`${GRAPH}/${igUserId}`, {
        access_token: workingToken,
        fields: 'username,name,profile_picture_url',
      }, `GET /${igUserId} (IG details)`)

      if (detailResult.ok) {
        igUsername = detailResult.data.username || detailResult.data.name || igUserId
      } else {
        igUsername = igUserId
      }
    }

    // ── Save to database ──────────────────────────────────────────
    console.log(`\n── Saving IG account to database ──`)
    console.log(`   IG User ID: ${igUserId}`)
    console.log(`   Username: @${igUsername}`)

    const tokenExpiresAt = addDays(new Date(), Math.floor(expiresIn / 86400))
    const existing = await prisma.iGAccount.findUnique({ where: { igUserId } })

    if (existing) {
      await prisma.iGAccount.update({
        where: { igUserId },
        data: {
          accessToken: encrypt(workingToken),
          igUsername: igUsername!,
          tokenExpiresAt,
          isActive: true,
          userId,
        },
      })
      console.log(`   ✅ Updated existing IG account: @${igUsername}`)
    } else {
      await prisma.iGAccount.create({
        data: {
          userId,
          igUserId,
          igUsername: igUsername!,
          accessToken: encrypt(workingToken),
          tokenExpiresAt,
          isActive: true,
        },
      })
      console.log(`   ✅ Created new IG account: @${igUsername}`)
    }

    console.log('\n══════════════════════════════════════════════════')
    console.log(`🎉 Instagram OAuth complete! Connected @${igUsername}`)
    console.log('══════════════════════════════════════════════════\n')
    return res.redirect(`${frontendUrl}/connect?success=true&count=1`)

  } catch (err: any) {
    console.error('\n❌ Instagram callback UNHANDLED error:', err.message)
    console.error('   Stack:', err.stack)
    if (err.response?.data) {
      console.error('   API response:', JSON.stringify(err.response.data, null, 2))
    }
    return res.redirect(`${frontendUrl}/connect?error=${encodeURIComponent('Something went wrong during Instagram connection')}`)
  }
})

// ──────────────────────────────────────────────────────────────────
// GET /api/instagram/accounts
// Returns all connected Instagram accounts for the logged-in user
// ──────────────────────────────────────────────────────────────────
instagramRouter.get('/accounts', async (req, res, next) => {
  try {
    const accounts = await prisma.iGAccount.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        igUserId: true,
        igUsername: true,
        tokenExpiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const enriched = accounts.map(acc => {
      const now = new Date()
      const daysUntilExpiry = Math.floor(
        (acc.tokenExpiresAt.getTime() - now.getTime()) / 86400000
      )
      const isExpired = daysUntilExpiry <= 0
      const isExpiringSoon = daysUntilExpiry > 0 && daysUntilExpiry <= 7

      return {
        ...acc,
        daysUntilExpiry,
        isExpired,
        isExpiringSoon,
        status: isExpired
          ? 'expired'
          : !acc.isActive
            ? 'disconnected'
            : isExpiringSoon
              ? 'expiring_soon'
              : 'connected',
      }
    })

    res.json(enriched)
  } catch (err) {
    next(err)
  }
})

// ──────────────────────────────────────────────────────────────────
// POST /api/instagram/connect-manual
// DEV MODE WORKAROUND: Manually connect an IG Business account
// by providing a Page Access Token from Graph API Explorer.
//
// How to get the values:
// 1. Go to https://developers.facebook.com/tools/explorer/
// 2. Select your app from the dropdown
// 3. Click "Get User Access Token" → check pages_show_list, instagram_basic, instagram_content_publish
// 4. Click "Generate Access Token"
// 5. In the query field, type: me/accounts?fields=id,name,access_token,instagram_business_account
// 6. Click Submit — copy the page's access_token and instagram_business_account.id
// ──────────────────────────────────────────────────────────────────
instagramRouter.post('/connect-manual', async (req, res, next) => {
  try {
    const { pageAccessToken, igBusinessAccountId } = req.body

    if (!pageAccessToken || !igBusinessAccountId) {
      return next(badRequest('Both pageAccessToken and igBusinessAccountId are required'))
    }

    console.log('\n══════════════════════════════════════════════════')
    console.log('🔧 Manual Instagram Connection')
    console.log('══════════════════════════════════════════════════')
    console.log(`   IG Business Account ID: ${igBusinessAccountId}`)

    // Verify the IG account exists and the token works
    const verifyResult = await graphGet(`${GRAPH}/${igBusinessAccountId}`, {
      access_token: pageAccessToken,
      fields: 'id,username,name,profile_picture_url',
    }, 'Verify IG account')

    if (!verifyResult.ok) {
      return next(badRequest(
        'Failed to verify IG account. Make sure the IG Business Account ID and Page Access Token are correct. ' +
        'Error: ' + JSON.stringify(verifyResult.error)
      ))
    }

    const igUserId = verifyResult.data.id
    const igUsername = verifyResult.data.username || verifyResult.data.name || igUserId
    const tokenExpiresAt = addDays(new Date(), 60)
    const userId = req.user!.id

    // Upsert
    const existing = await prisma.iGAccount.findUnique({ where: { igUserId } })

    if (existing) {
      await prisma.iGAccount.update({
        where: { igUserId },
        data: {
          accessToken: encrypt(pageAccessToken),
          igUsername,
          tokenExpiresAt,
          isActive: true,
          userId,
        },
      })
      console.log(`   ✅ Updated existing IG account: @${igUsername}`)
    } else {
      await prisma.iGAccount.create({
        data: {
          userId,
          igUserId,
          igUsername,
          accessToken: encrypt(pageAccessToken),
          tokenExpiresAt,
          isActive: true,
        },
      })
      console.log(`   ✅ Created new IG account: @${igUsername}`)
    }

    console.log('══════════════════════════════════════════════════\n')

    res.json({
      success: true,
      account: { igUserId, igUsername },
      message: `Successfully connected @${igUsername}`,
    })
  } catch (err) {
    next(err)
  }
})

