import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { Queue } from 'bullmq';

const prisma = new PrismaClient();
const publishQueue = new Queue('publish', { connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: 6379 } });

export const postSchema = z.object({
  type: z.enum(['feed', 'story', 'carousel']).default('feed'),
  caption: z.string().optional().default(''),
  hashtags: z.array(z.string()).default([]),
  mediaUrls: z.array(z.string()).default([]),
  scheduledAt: z.string().datetime(),
});

export const patchPostSchema = postSchema.partial().extend({
  status: z.enum(['scheduled', 'draft']).optional()
});

export const postsController = {
  listPosts: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const posts = await prisma.post.findMany({
        where: { userId: req.user!.userId },
        orderBy: { scheduledAt: 'asc' }
      });
      res.json(posts);
    } catch (e) {
      next(e);
    }
  },

  createPost: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const post = await prisma.post.create({
        data: {
          ...req.body,
          userId: req.user!.userId,
        }
      });
      
      const delay = new Date(post.scheduledAt).getTime() - Date.now();
      if (delay > 0) {
        await publishQueue.add('publish-post', { postId: post.id }, { delay, jobId: post.id });
      }

      res.status(201).json(post);
    } catch (e) {
      next(e);
    }
  },

  updatePost: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const post = await prisma.post.findFirst({
        where: { id: req.params.id, userId: req.user!.userId }
      });
      if (!post) return res.status(404).json({ error: 'Post not found' });
      if (post.status === 'published') return res.status(400).json({ error: 'Cannot modify published post' });

      const updated = await prisma.post.update({
        where: { id: post.id },
        data: req.body
      });

      if (req.body.scheduledAt) {
        const delay = new Date(updated.scheduledAt).getTime() - Date.now();
        await publishQueue.remove(post.id);
        if (delay > 0) {
          await publishQueue.add('publish-post', { postId: updated.id }, { delay, jobId: post.id });
        }
      }

      res.json(updated);
    } catch (e) {
      next(e);
    }
  },

  deletePost: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const post = await prisma.post.findFirst({
        where: { id: req.params.id, userId: req.user!.userId }
      });
      if (!post) return res.status(404).json({ error: 'Post not found' });

      await publishQueue.remove(post.id);
      await prisma.post.delete({ where: { id: post.id } });
      res.json({ message: 'Deleted' });
    } catch (e) {
      next(e);
    }
  },

  publishPost: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const post = await prisma.post.findFirst({
        where: { id: req.params.id, userId: req.user!.userId }
      });
      if (!post) return res.status(404).json({ error: 'Post not found' });

      // remove from queue if it's there
      await publishQueue.remove(post.id);
      
      // Schedule immediately
      await publishQueue.add('publish-post', { postId: post.id }, { priority: 1 });
      
      res.json({ message: 'Publish job queued immediately' });
    } catch (e) {
      next(e);
    }
  },

  getPostStatus: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const post = await prisma.post.findFirst({
        where: { id: req.params.id, userId: req.user!.userId },
        select: { status: true, igMediaId: true }
      });
      if (!post) return res.status(404).json({ error: 'Post not found' });
      res.json(post);
    } catch (e) {
      next(e);
    }
  }
};
