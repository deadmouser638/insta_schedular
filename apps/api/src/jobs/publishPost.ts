import { prisma } from '../lib/prisma'
import { InstagramService } from '../services/instagram'
import { decrypt } from '../lib/crypto'
import { logger } from '../lib/logger'

export async function publishPost(post: any) {
  const account = await prisma.iGAccount.findUnique({ where: { id: post.igAccountId } })
  if (!account) throw new Error('IG account not found')

  const token = decrypt(account.accessToken) // always decrypt before use
  const ig = new InstagramService(token, account.igUserId)

  await prisma.post.update({ where: { id: post.id }, data: { status: 'publishing' } })

  try {
    const fullCaption = `${post.caption || ''}\n\n${(post.hashtags || []).map((t: string) => '#' + t).join(' ')}`
    let igMediaId: string

    if (post.type === 'carousel') {
      const containerId = await ig.createCarouselContainer(post.imageUrls, fullCaption)
      await delay(3000) // wait for container processing
      igMediaId = await ig.publishContainer(containerId)
    } else {
      const containerId = await ig.createMediaContainer(post.imageUrls[0], fullCaption, post.type)
      await delay(3000)
      igMediaId = await ig.publishContainer(containerId)
    }

    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'published', publishedAt: new Date(), igMediaId, errorMessage: null },
    })

    logger.info({ postId: post.id, igMediaId }, 'Post published successfully')
  } catch (err: any) {
    await prisma.post.update({
      where: { id: post.id },
      data: { status: 'failed', errorMessage: err.message },
    })
    logger.error({ postId: post.id, error: err.message }, 'Publish failed')
    throw err // re-throw so BullMQ can retry
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
