import { Queue } from 'bullmq';
import { redis } from './redis';
export const publishQueue = new Queue('publish', { connection: redis });
