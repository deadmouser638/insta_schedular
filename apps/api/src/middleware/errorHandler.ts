import { Request, Response, NextFunction } from 'express'
import { AppError } from '../lib/errors'
import { ZodError } from 'zod'

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Zod validation error
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: err.issues.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
  }

  // App-level known error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    })
  }

  // Unknown error — log it, return generic 500
  console.error('[Unhandled error]', err)
  return res.status(500).json({ error: 'Internal server error' })
}
