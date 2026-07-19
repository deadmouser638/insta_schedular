import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const settingsSchema = z.object({
  niche: z.string().optional(),
  defaultTone: z.string().optional(),
  defaultSlots: z.array(z.string()).optional()
});

export const settingsController = {
  getSettings: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { niche: true, defaultTone: true, defaultSlots: true }
      });
      res.json(user);
    } catch (e) {
      next(e);
    }
  },

  updateSettings: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: req.user!.userId },
        data: req.body,
        select: { niche: true, defaultTone: true, defaultSlots: true }
      });
      res.json(updatedUser);
    } catch (e) {
      next(e);
    }
  }
};
