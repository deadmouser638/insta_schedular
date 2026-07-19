import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

declare global {
  namespace Express {
    interface Request { user?: { id: string; email: string; name?: string } }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // DEV BYPASS: Auto-authenticate as a default dev user directly
  try {
    let user = await prisma.user.findUnique({ where: { email: 'dev@example.com' } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: 'dev@example.com', password: 'password', name: 'Dev User' }
      });
    }
    req.user = { id: user.id, email: user.email, name: user.name }
    next()
  } catch (err) {
    res.status(500).json({ error: 'Auth Bypass Failed' })
  }
}
