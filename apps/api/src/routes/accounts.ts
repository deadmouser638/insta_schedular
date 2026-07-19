import { Router } from 'express'
import axios from 'axios'
import { z } from 'zod'
import { addDays } from 'date-fns'
import { prisma } from '../lib/prisma'
import { encrypt, decrypt } from '../lib/crypto'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { badRequest, notFound } from '../lib/errors'

export const accountsRouter = Router()
accountsRouter.use(authMiddleware)

const GRAPH = 'https://graph.facebook.com/v19.0'

// ── LIST accounts ─────────────────────────────────────────────────
accountsRouter.get('/', async (req, res, next) => {
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
      },
    })
    res.json(accounts)
  } catch (err) {
    next(err)
  }
})

// ── CONNECT a new IG account ──────────────────────────────────────
const connectSchema = z.object({
  igUserId: z.string().min(5, 'Invalid IG User ID'),
  accessToken: z.string().min(10, 'Invalid access token'),
})

accountsRouter.post('/', validate(connectSchema), async (req, res, next) => {
  try {
    const { igUserId, accessToken } = req.body

    // Verify the token works before saving
    let igUsername: string
    try {
      const { data } = await axios.get(`${GRAPH}/${igUserId}`, {
        params: { fields: 'username,name', access_token: accessToken },
        timeout: 10000,
      })
      if (data.error) throw new Error(data.error.message)
      igUsername = data.username ?? data.name ?? igUserId
    } catch (err: any) {
      return next(badRequest(`Instagram verification failed: ${err.message}`))
    }

    // Check if account already connected
    const existing = await prisma.iGAccount.findUnique({ where: { igUserId } })
    if (existing && existing.userId === req.user!.id) {
      // Update token
      await prisma.iGAccount.update({
        where: { igUserId },
        data: {
          accessToken: encrypt(accessToken),
          tokenExpiresAt: addDays(new Date(), 60),
          isActive: true,
          igUsername,
        },
      })
      return res.json({ message: 'Account reconnected', igUsername })
    }
    if (existing && existing.userId !== req.user!.id) {
      return next(badRequest('This Instagram account is already connected to another user'))
    }

    const account = await prisma.iGAccount.create({
      data: {
        userId: req.user!.id,
        igUserId,
        igUsername,
        accessToken: encrypt(accessToken),
        tokenExpiresAt: addDays(new Date(), 60),
      },
      select: {
        id: true, igUserId: true, igUsername: true,
        tokenExpiresAt: true, isActive: true,
      },
    })

    res.status(201).json(account)
  } catch (err) {
    next(err)
  }
})

// ── TEST connection for an existing account ───────────────────────
accountsRouter.post('/:id/test', async (req, res, next) => {
  try {
    const account = await prisma.iGAccount.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    })
    if (!account) return next(notFound('Account not found'))

    const token = decrypt(account.accessToken)
    const daysLeft = Math.floor(
      (account.tokenExpiresAt.getTime() - Date.now()) / 86400000
    )

    try {
      const { data } = await axios.get(`${GRAPH}/${account.igUserId}`, {
        params: { fields: 'username,name,ig_id', access_token: token },
        timeout: 10000,
      })

      if (data.error) {
        // Classify the IG error code
        const code = data.error.code
        let hint = data.error.message
        if (code === 190) hint = 'Token invalid or expired — regenerate a long-lived token in Graph API Explorer'
        if (code === 100) hint = 'Invalid field requested — check the API version'
        if (code === 10) hint = 'Permission denied — ensure instagram_basic and instagram_content_publish are approved'

        return res.status(400).json({
          ok: false,
          igError: { code, message: data.error.message, hint },
        })
      }

      res.json({
        ok: true,
        igUsername: data.username ?? data.name,
        daysUntilExpiry: daysLeft,
        expiryWarning: daysLeft <= 7 ? `Token expires in ${daysLeft} days — refresh soon` : null,
      })
    } catch (networkErr: any) {
      res.status(502).json({
        ok: false,
        igError: { code: 0, message: 'Network error reaching Meta API', hint: networkErr.message },
      })
    }
  } catch (err) {
    next(err)
  }
})

// ── DELETE / disconnect account ───────────────────────────────────
accountsRouter.delete('/:id', async (req, res, next) => {
  try {
    const account = await prisma.iGAccount.findFirst({
      where: { id: String(req.params.id), userId: req.user!.id },
    })
    if (!account) return next(notFound('Account not found'))

    await prisma.iGAccount.delete({ where: { id: String(req.params.id) } })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})
