import { Request, Response, NextFunction } from 'express'
import { prisma, ensureDbSchema } from '../lib/prisma'

declare global {
  namespace Express {
    interface Request { user?: { id: string; email: string; name?: string } }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    await ensureDbSchema()
    let user = await prisma.user.findUnique({ where: { email: 'dev@example.com' } })
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'dev@example.com', password: 'password', name: 'Dev User' }
      })
    }
    req.user = { id: user.id, email: user.email, name: user.name }
    next()
  } catch (err: any) {
    console.warn('[AuthMiddleware] Falling back to memory dev user:', err?.message || err)
    req.user = { id: 'dev-user-default-id', email: 'dev@example.com', name: 'Dev User' }
    next()
  }
}
