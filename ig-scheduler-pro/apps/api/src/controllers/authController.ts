import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function generateTokens(userId: string, email: string) {
  const accessToken = jwt.sign(
    { userId, email },
    process.env.JWT_SECRET as string,
    { expiresIn: '15m' }
  );
  // generate a secure random string for the refresh token
  const refreshToken = crypto.randomBytes(40).toString('hex');
  return { accessToken, refreshToken };
}

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const existingUser = await prisma.user.findUnique({ where: { email } });
      
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { email, passwordHash },
      });

      res.status(201).json({ message: 'User created successfully', user: { id: user.id, email: user.email } });
    } catch (e) {
      next(e);
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const { accessToken, refreshToken } = generateTokens(user.id, user.email);

      // Store refresh token in DB with 30-day expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      await prisma.refreshToken.create({
        data: { token: refreshToken, userId: user.id, expiresAt }
      });

      // Set cookie securely
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        accessToken,
        user: { id: user.id, email: user.email, niche: user.niche, defaultTone: user.defaultTone }
      });
    } catch (e) {
      next(e);
    }
  },

  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cookieStr = req.headers.cookie;
      const match = cookieStr?.match(/(?:^|;\s*)refreshToken=([^;]+)/);
      const refreshToken = match ? match[1] : null;
      
      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token provided' });
      }

      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      });

      if (!storedToken) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      if (new Date() > storedToken.expiresAt) {
        await prisma.refreshToken.delete({ where: { id: storedToken.id } });
        return res.status(401).json({ error: 'Refresh token expired' });
      }

      const newAccessToken = jwt.sign(
        { userId: storedToken.user.id, email: storedToken.user.email },
        process.env.JWT_SECRET as string,
        { expiresIn: '15m' }
      );

      res.json({ accessToken: newAccessToken });
    } catch (e) {
      next(e);
    }
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cookieStr = req.headers.cookie;
      const match = cookieStr?.match(/(?:^|;\s*)refreshToken=([^;]+)/);
      const refreshToken = match ? match[1] : null;
      
      if (refreshToken) {
        await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
      }
      res.clearCookie('refreshToken');
      res.json({ message: 'Logged out successfully' });
    } catch (e) {
      next(e);
    }
  }
};
