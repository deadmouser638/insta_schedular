import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { decrypt } from '../lib/crypto';

const prisma = new PrismaClient();
const GRAPH = 'https://graph.facebook.com/v19.0';
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const worker = new Worker('publish', async (job: Job) => {
  if (job.name === 'publish-post') {
    const { postId } = job.data;
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: { include: { accounts: true } } }
    });

    if (!post || post.status === 'published' || post.status === 'deleted') {
      return; 
    }

    const account = post.user.accounts[0]; // Assuming one account per user for now, or you'd map igAccountId
    if (!account) throw new Error('No Instagram account linked');

    const token = decrypt(account.encryptedToken);
    const igUserId = account.igUserId;

    await prisma.post.update({ where: { id: post.id }, data: { status: 'publishing' } });

    try {
      let containerId;
      const fullCaption = `${post.caption ?? ''}\n\n${post.hashtags.map(t => '#' + t).join(' ')}`.trim();

      if (post.type === 'carousel') {
        const itemIds = [];
        for (const url of post.mediaUrls) {
          const { data } = await axios.post(`${GRAPH}/${igUserId}/media`, {
            image_url: url,
            is_carousel_item: true,
            access_token: token
          });
          if (data.error) throw new Error(data.error.message);
          itemIds.push(data.id);
        }
        
        const { data: container } = await axios.post(`${GRAPH}/${igUserId}/media`, {
          media_type: 'CAROUSEL',
          children: itemIds.join(','),
          caption: fullCaption,
          access_token: token
        });
        if (container.error) throw new Error(container.error.message);
        containerId = container.id;
      } else {
        const { data: container } = await axios.post(`${GRAPH}/${igUserId}/media`, {
          image_url: post.mediaUrls[0],
          caption: fullCaption,
          access_token: token,
          ...(post.type === 'story' ? { media_type: 'STORIES' } : {})
        });
        if (container.error) throw new Error(container.error.message);
        containerId = container.id;
      }

      await delay(3000); // give Meta time to process

      const { data: publishRes } = await axios.post(`${GRAPH}/${igUserId}/media_publish`, {
        creation_id: containerId,
        access_token: token
      });
      if (publishRes.error) throw new Error(publishRes.error.message);

      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
          igMediaId: publishRes.id
        }
      });
    } catch (e: any) {
      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'failed', caption: `FAILED: ${e.message}\n${post.caption}` }
      });
      throw e;
    }
  }
}, {
  connection: { host: process.env.REDIS_HOST || '127.0.0.1', port: 6379 }
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
