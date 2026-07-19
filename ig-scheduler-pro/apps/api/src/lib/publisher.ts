import { prisma } from './prisma';
import { decrypt } from './crypto';
import axios from 'axios';

export async function publishPostById(postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new Error('Post not found');
  
  const account = await prisma.igAccount.findFirst({ where: { userId: post.userId } });
  if (!account) throw new Error('No IG Account connected');
  
  const token = decrypt(account.encryptedToken);
  let igMediaId: string | undefined;

  const url = `https://graph.facebook.com/v19.0/${account.igUserId}/media`;
  
  if (post.type === 'story') {
    const res = await axios.post(url, { image_url: post.mediaUrls[0], media_type: 'STORIES', access_token: token });
    igMediaId = res.data.id;
  } else if (post.mediaUrls.length === 1) { 
    const captionText = post.hashtags.length > 0 ? `${post.caption || ''}\n\n${post.hashtags.join(' ')}` : (post.caption || '');
    const res = await axios.post(url, { image_url: post.mediaUrls[0], caption: captionText, access_token: token });
    igMediaId = res.data.id;
  } else {
    const childrenIds = [];
    for (const mediaUrl of post.mediaUrls) {
      const childRes = await axios.post(url, { image_url: mediaUrl, is_carousel_item: true, access_token: token });
      childrenIds.push(childRes.data.id);
    }
    const captionText = post.hashtags.length > 0 ? `${post.caption || ''}\n\n${post.hashtags.join(' ')}` : (post.caption || '');
    const res = await axios.post(url, { children: childrenIds, caption: captionText, media_type: 'CAROUSEL', access_token: token });
    igMediaId = res.data.id;
  }

  await new Promise(r => setTimeout(r, 2000));
  
  const publishUrl = `https://graph.facebook.com/v19.0/${account.igUserId}/media_publish`;
  await axios.post(publishUrl, { creation_id: igMediaId, access_token: token });
  
  return prisma.post.update({
    where: { id: postId },
    data: { status: 'published', igMediaId, publishedAt: new Date() }
  });
}
