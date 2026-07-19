import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { encrypt } from '../lib/crypto';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
const GRAPH = 'https://graph.facebook.com/v19.0';

export const connectSchema = z.object({
  igUserId: z.string().min(1),
  accessToken: z.string().min(1),
});

export const accountsController = {
  getAccount: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const account = await prisma.igAccount.findFirst({
        where: { userId: req.user!.userId }
      });
      res.json(account || null);
    } catch (e) {
      next(e);
    }
  },
  
  connectAccount: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { igUserId, accessToken } = req.body;
      let igUsername;
      
      try {
        const { data } = await axios.get(`${GRAPH}/${igUserId}`, {
          params: { fields: 'username,name', access_token: accessToken },
        });
        igUsername = data.username || data.name || igUserId;
      } catch (err: any) {
        return res.status(400).json({ error: 'Instagram verification failed', details: err.message });
      }

      const existing = await prisma.igAccount.findFirst({ where: { userId: req.user!.userId } });
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 60);

      const payload = {
        igUserId,
        igUsername,
        encryptedToken: encrypt(accessToken),
        tokenExpiresAt: expDate
      };

      let account;
      if (existing) {
        account = await prisma.igAccount.update({
          where: { id: existing.id },
          data: payload
        });
      } else {
        account = await prisma.igAccount.create({
          data: { ...payload, userId: req.user!.userId }
        });
      }
      res.json(account);
    } catch (e) {
      next(e);
    }
  },

  disconnectAccount: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await prisma.igAccount.deleteMany({ where: { userId: req.user!.userId } });
      res.json({ message: 'Account disconnected' });
    } catch (e) {
      next(e);
    }
  }
};
