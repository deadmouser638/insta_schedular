import { Router } from 'express'
import axios from 'axios'
import { prisma } from '../lib/prisma'
import { decrypt } from '../lib/crypto'
import { authMiddleware } from '../middleware/auth'
import { notFound, badRequest } from '../lib/errors'

export const publishRouter = Router()
publishRouter.use(authMiddleware)

const GRAPH = 'https://graph.facebook.com/v19.0'
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

class IGError extends Error {
  constructor(public code: number, message: string) {
    super(`IG API Error ${code}: ${message}`)
    this.name = 'IGError'
  }
}

publishRouter.post('/:id/publish', async (req, res, next) => {
  try {
    const post = await prisma.post.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
      include: { igAccount: true },
    })
    if (!post) return next(notFound('Post not found'))
    if (post.status === 'published') return next(badRequest('Already published'))
    if (post.status === 'publishing') return next(badRequest('Publish already in progress'))

    const token = decrypt(post.igAccount.accessToken)
    const igUserId = post.igAccount.igUserId
    const hashtags: string[] = JSON.parse(post.hashtags || '[]')
    const imageUrls: string[] = JSON.parse(post.imageUrls || '[]')
    const fullCaption = [
      post.caption,
      hashtags.length ? hashtags.map((t) => `#${t}`).join(' ') : '',
    ].filter(Boolean).join('\n\n')

    await prisma.post.update({ where: { id: post.id }, data: { status: 'publishing' } })

    try {
      // STEP A — create media container
      let containerParams: Record<string, string>
      if (post.type === 'story') {
        containerParams = { image_url: imageUrls[0], media_type: 'STORIES', access_token: token }
      } else if (post.type === 'carousel') {
        // create child items first
        const childIds: string[] = []
        for (const url of imageUrls) {
          const { data: child } = await axios.post(`${GRAPH}/${igUserId}/media`, {
            image_url: url,
            is_carousel_item: 'true',
            access_token: token,
          })
          if (child.error) throw new IGError(child.error.code, child.error.message)
          childIds.push(child.id)
        }
        containerParams = {
          media_type: 'CAROUSEL',
          children: childIds.join(','),
          caption: fullCaption,
          access_token: token,
        }
      } else {
        containerParams = { image_url: imageUrls[0], caption: fullCaption, access_token: token }
      }

      const { data: container } = await axios.post(
        `${GRAPH}/${igUserId}/media`,
        new URLSearchParams(containerParams).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      if (container.error) throw new IGError(container.error.code, container.error.message)

      // STEP B — wait 3 seconds for Meta to process the container
      await delay(3000)

      // STEP C — publish
      const { data: published } = await axios.post(
        `${GRAPH}/${igUserId}/media_publish`,
        new URLSearchParams({ creation_id: container.id, access_token: token }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      if (published.error) throw new IGError(published.error.code, published.error.message)

      const updated = await prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
          igMediaId: published.id,
          errorMessage: null,
        },
      })

      res.json({ ok: true, igMediaId: published.id, post: updated })
    } catch (igErr: any) {
      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'failed', errorMessage: igErr.message },
      })
      throw igErr
    }
  } catch (err) {
    next(err)
  }
})
