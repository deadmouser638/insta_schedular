import { Queue, Worker } from 'bullmq'
import { redis } from '../lib/redis'
import { prisma } from '../lib/prisma'
import { publishPost } from '../jobs/publishPost'
import { logger } from '../lib/logger'

export const publishQueue = new Queue('publish', { connection: redis as any })

// Schedule a post — adds a delayed BullMQ job
export async function schedulePost(post: any) {
  const delayTime = new Date(post.scheduledAt).getTime() - Date.now()
  if (delayTime < 0) {
    logger.warn({ postId: post.id }, 'Skipping past-due post')
    return
  }

  await publishQueue.add(
    'publish-post',
    { postId: post.id },
    {
      delay: delayTime,
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
      jobId: `post-${post.id}`, // prevents duplicate jobs
    }
  )

  logger.info({ postId: post.id, scheduledAt: post.scheduledAt }, 'Post enqueued')
}

// Worker that processes publish jobs
export function startScheduler() {
  const worker = new Worker(
    'publish',
    async (job) => {
      const post = await prisma.post.findUnique({ where: { id: job.data.postId } })
      if (!post || post.status !== 'scheduled') return
      await publishPost(post)
    },
    { connection: redis as any, concurrency: 5 }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Publish job failed')
  })

  logger.info('BullMQ scheduler started')
}
