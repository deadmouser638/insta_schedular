import IORedis from 'ioredis'

export const redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy(times) {
    // Stop retrying endlessly in serverless environment
    if (process.env.VERCEL || process.env.NOW_REGION) return null
    return Math.min(times * 100, 3000)
  },
})

redis.on('connect', () => console.log('[Redis] Connected'))
redis.on('error', (err) => {
  // Silent warning for optional background queue connection
  if (process.env.NODE_ENV !== 'production') console.warn('[Redis] Warning:', err.message)
})
