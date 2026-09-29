import { PrismaClient } from '@prisma/client'
import path from 'path'

// Handle SQLite database in Vercel serverless environment (/tmp fallback)
if (process.env.VERCEL || process.env.NOW_REGION) {
  const tmpDbPath = path.join('/tmp', 'dev.db')
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('./dev.db')) {
    process.env.DATABASE_URL = `file:${tmpDbPath}`
  }
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; initialized?: boolean }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Self-healing: auto-create SQLite tables on serverless startup if missing
export async function ensureDbSchema() {
  if (globalForPrisma.initialized) return
  globalForPrisma.initialized = true
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "name" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "niche" TEXT,
        "defaultTone" TEXT DEFAULT 'chill',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "userId" TEXT NOT NULL,
        "refreshToken" TEXT UNIQUE NOT NULL,
        "expiresAt" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
      );
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "IGAccount" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "userId" TEXT NOT NULL,
        "igUserId" TEXT UNIQUE NOT NULL,
        "igUsername" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "tokenExpiresAt" DATETIME NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT 1,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
      );
    `)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Post" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "userId" TEXT NOT NULL,
        "igAccountId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'scheduled',
        "caption" TEXT,
        "hashtags" TEXT NOT NULL DEFAULT '[]',
        "imageUrls" TEXT NOT NULL DEFAULT '[]',
        "scheduledAt" DATETIME NOT NULL,
        "publishedAt" DATETIME,
        "igMediaId" TEXT,
        "errorMessage" TEXT,
        "method" TEXT NOT NULL DEFAULT 'api',
        "bullJobId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("igAccountId") REFERENCES "IGAccount" ("id")
      );
    `)
  } catch (err) {
    console.error('[DB] Schema init warning:', err)
  }
}

// Trigger schema initialization
ensureDbSchema().catch(() => {})
