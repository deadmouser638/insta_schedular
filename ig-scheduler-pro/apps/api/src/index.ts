import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

// Routers
import authRouter from './routes/auth';
import accountsRouter from './routes/accounts';
import postsRouter from './routes/posts';
import captionsRouter from './routes/captions';
import uploadsRouter from './routes/uploads';
import settingsRouter from './routes/settings';

// Jobs & Middleware
import { startScheduler } from './jobs/scheduler';
import './jobs/publishJob';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ── 1. Security & Cors ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── 2. Parsing ─────────────────────────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── 3. Health Check ────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ── 4. Routes ──────────────────────────────────────────────────────
// The internal route files (e.g. routes/posts.ts) govern the specific 
// sub-paths like /:id/publish vs /:id internally.
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/posts', postsRouter);
app.use('/api/captions', captionsRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/settings', settingsRouter);

// ── 5. 404 Handler ─────────────────────────────────────────────────
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── 6. Global Error Handler ────────────────────────────────────────
app.use(errorHandler as any);

// ── 7. Boot ────────────────────────────────────────────────────────
// Start Background Workers/Schedulers
startScheduler();

app.listen(PORT, () => {
  console.log(`🚀 API running → http://localhost:${PORT}`);
});

export default app;
