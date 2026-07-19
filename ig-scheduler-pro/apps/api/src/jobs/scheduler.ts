// Background schedulers to handle tasks that missed their BullMQ window.
import { Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const publishQueue = new Queue('publish', { connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: 6379 } });

export const startScheduler = () => {
  // Option: setup a lightweight cron interval that sweeps prisma for stuck "scheduled" posts
  setInterval(async () => {
    try {
      const pending = await prisma.post.findMany({
        where: {
          status: 'scheduled',
          scheduledAt: { lte: new Date() }
        }
      });
      
      for (const p of pending) {
        await publishQueue.add('publish-post', { postId: p.id }, { jobId: p.id });
      }
    } catch (e) {}
  }, 1000 * 60 * 5); // runs every 5 minutes as a fallback
};
