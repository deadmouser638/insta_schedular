import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

// Handle SQLite database in Vercel serverless environment (/tmp fallback)
if (process.env.VERCEL || process.env.NOW_REGION) {
  const tmpDbPath = path.join('/tmp', 'dev.db')
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('./dev.db')) {
    process.env.DATABASE_URL = `file:${tmpDbPath}`
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
