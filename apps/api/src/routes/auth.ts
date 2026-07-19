import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuid } from 'uuid'
import { addDays } from 'date-fns'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { badRequest, unauthorized } from '../lib/errors'

export const authRouter = Router()

// ── REGISTER ─────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'Name too short').max(60),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

authRouter.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, name, password } = req.body

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return next(badRequest('Email already registered'))

    const hashed = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, name, password: hashed },
      select: { id: true, email: true, name: true, createdAt: true },
    })

    res.status(201).json({ user })
  } catch (err) {
    next(err)
  }
})

// ── LOGIN ─────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

authRouter.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return next(unauthorized('Invalid credentials'))

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return next(unauthorized('Invalid credentials'))

    const secret = process.env.JWT_SECRET!
    const accessToken = jwt.sign({ id: user.id, email: user.email }, secret, {
      expiresIn: '15m',
    })

    const refreshToken = uuid()
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: addDays(new Date(), 30),
      },
    })

    // Refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    })

    res.json({
      accessToken,
      user: { id: user.id, email: user.email, name: user.name },
    })
  } catch (err) {
    next(err)
  }
})

// ── REFRESH ───────────────────────────────────────────────────────
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (!token) return next(unauthorized('No refresh token'))

    const session = await prisma.session.findUnique({
      where: { refreshToken: token },
      include: { user: true },
    })

    if (!session) return next(unauthorized('Session not found'))
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { id: session.id } })
      return next(unauthorized('Session expired — please log in again'))
    }

    const accessToken = jwt.sign(
      { id: session.user.id, email: session.user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' }
    )

    res.json({ accessToken })
  } catch (err) {
    next(err)
  }
})

// ── LOGOUT ────────────────────────────────────────────────────────
authRouter.post('/logout', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken
    if (token) {
      await prisma.session.deleteMany({ where: { refreshToken: token } })
    }
    res.clearCookie('refreshToken')
    res.json({ message: 'Logged out' })
  } catch (err) {
    next(err)
  }
})

// ── ME (get current user) ─────────────────────────────────────────

authRouter.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, niche: true, defaultTone: true },
    })
    if (!user) return next(unauthorized('User not found'))
    res.json({ user })
  } catch (err) {
    next(err)
  }
})
