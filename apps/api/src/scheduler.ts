import cron from 'node-cron'
import axios from 'axios'
import { prisma } from './lib/prisma'
import { decrypt } from './lib/crypto'

const GRAPH = 'https://graph.facebook.com/v19.0'
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Track scheduler state for the status endpoint
let schedulerRunning = false
let lastRunAt: Date | null = null
let lastRunProcessed = 0
let totalPublished = 0
let totalFailed = 0

export function getSchedulerStatus() {
  return {
    running: schedulerRunning,
    lastRunAt: lastRunAt?.toISOString() ?? null,
    lastRunProcessed,
    totalPublished,
    totalFailed,
  }
}

// ── Publish a single post via Instagram Graph API ─────────────────
async function publishPost(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { igAccount: true },
  })

  if (!post || !post.igAccount) {
    await prisma.post.update({
      where: { id: postId },
      data: { status: 'failed', errorMessage: 'Post or IG account not found' },
    })
    totalFailed++
    return
  }

  // Decrypt the stored access token
  let token: string
  try {
    token = decrypt(post.igAccount.accessToken)
  } catch (err) {
    await prisma.post.update({
      where: { id: postId },
      data: { status: 'failed', errorMessage: 'Failed to decrypt access token — token may be corrupted' },
    })
    totalFailed++
    return
  }

  // Check if token is expired
  if (post.igAccount.tokenExpiresAt < new Date()) {
    await prisma.post.update({
      where: { id: postId },
      data: { status: 'failed', errorMessage: 'Access token expired — reconnect your Instagram account' },
    })
    totalFailed++
    return
  }

  const igUserId = post.igAccount.igUserId
  const hashtags: string[] = JSON.parse(post.hashtags || '[]')
  const imageUrls: string[] = JSON.parse(post.imageUrls || '[]')

  if (imageUrls.length === 0) {
    await prisma.post.update({
      where: { id: postId },
      data: { status: 'failed', errorMessage: 'No image URLs provided' },
    })
    totalFailed++
    return
  }

  // Verify that URLs are publicly accessible (Instagram API requirement)
  for (const url of imageUrls) {
    if (url.startsWith('http://localhost') || url.startsWith('https://localhost') || url.includes('127.0.0.1')) {
      const errorMsg = 'Image must be a public URL, not localhost'
      await prisma.post.update({
        where: { id: postId },
        data: { status: 'failed', errorMessage: errorMsg },
      })
      totalFailed++
      console.error(`  ❌ Failed to publish post ${postId}:`, errorMsg)
      return
    }
  }

  // Build full caption with hashtags
  const fullCaption = [
    post.caption,
    hashtags.length
      ? hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')
      : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  // Mark as publishing
  await prisma.post.update({
    where: { id: postId },
    data: { status: 'publishing' },
  })

  try {
    // STEP 1 — Create media container
    let containerParams: Record<string, string>

    if (post.type === 'story') {
      containerParams = {
        image_url: imageUrls[0],
        caption: fullCaption,
        media_type: 'STORIES',
        access_token: token,
      }
    } else if (post.type === 'carousel') {
      // Create child items first
      const childIds: string[] = []
      for (const url of imageUrls) {
        const childParams = {
          image_url: url,
          is_carousel_item: 'true',
          access_token: token,
        }
        
        console.log(`📡 Payload (Carousel Child):`, { ...childParams, access_token: '***' })
        
        const { data: child } = await axios.post(
          `${GRAPH}/${igUserId}/media`,
          new URLSearchParams(childParams).toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 }
        )
        if (child.error) {
          throw new Error(`Carousel child creation failed: ${child.error.message}`)
        }
        childIds.push(child.id)
      }
      containerParams = {
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption: fullCaption,
        access_token: token,
      }
    } else {
      // Feed post
      containerParams = {
        image_url: imageUrls[0],
        caption: fullCaption,
        media_type: 'IMAGE',
        access_token: token,
      }
    }

    console.log(`📡 Payload (Media Container):`, { ...containerParams, access_token: '***' })

    const { data: container } = await axios.post(
      `${GRAPH}/${igUserId}/media`,
      new URLSearchParams(containerParams).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 }
    )

    if (container.error) {
      throw new Error(`Container creation failed: ${container.error.message}`)
    }

    // STEP 2 — Wait for Meta to process the container
    await delay(5000)

    // STEP 3 — Publish the container
    const publishParams = {
      creation_id: container.id,
      access_token: token,
    }
    
    console.log(`📡 Payload (Publish Media):`, { ...publishParams, access_token: '***' })
    
    const { data: published } = await axios.post(
      `${GRAPH}/${igUserId}/media_publish`,
      new URLSearchParams(publishParams).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 }
    )

    if (published.error) {
      throw new Error(`Publish failed: ${published.error.message}`)
    }

    // STEP 4 — Mark as published
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        igMediaId: published.id,
        errorMessage: null,
      },
    })

    totalPublished++
    console.log(`  ✅ Published post ${postId} → IG media ${published.id}`)
  } catch (err: any) {
    // Extract meaningful error message
    const errorMsg =
      err.response?.data?.error?.message ||
      err.message ||
      'Unknown publishing error'

    await prisma.post.update({
      where: { id: postId },
      data: { status: 'failed', errorMessage: errorMsg },
    })

    totalFailed++
    console.error(`  ❌ Failed to publish post ${postId}:`, errorMsg)
  }
}

// ── Exported function to publish a single post by ID (for manual "Publish Now") ──
export async function publishPostById(postId: string): Promise<void> {
  return publishPost(postId)
}

// ── The cron job tick ─────────────────────────────────────────────
async function schedulerTick() {
  if (schedulerRunning) {
    console.log('⏭️  Scheduler tick skipped — previous run still in progress')
    return
  }

  schedulerRunning = true
  lastRunAt = new Date()

  try {
    // Find all posts that are due
    const duePosts = await prisma.post.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    lastRunProcessed = duePosts.length

    if (duePosts.length === 0) {
      schedulerRunning = false
      return
    }

    console.log(`\n📤 Scheduler: ${duePosts.length} post(s) due for publishing...`)

    // Process posts sequentially to avoid rate limiting
    for (const post of duePosts) {
      await publishPost(post.id)
      // Small delay between posts to be kind to the API
      if (duePosts.length > 1) await delay(2000)
    }

    console.log(`📤 Scheduler run complete: ${duePosts.length} post(s) processed\n`)
  } catch (err) {
    console.error('⚠️  Scheduler error:', err)
  } finally {
    schedulerRunning = false
  }
}

// ── Start the scheduler ───────────────────────────────────────────
export function startScheduler() {
  // Run every minute
  cron.schedule('* * * * *', schedulerTick)

  console.log('⏰ Post scheduler started — checking every minute for due posts')

  // Also run once immediately on startup
  setTimeout(schedulerTick, 3000)
}
