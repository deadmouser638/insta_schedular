import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuid } from 'uuid';

export const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|webp|gif)$/, 'Only specific image formats are supported')
});

export const uploadsController = {
  presign: async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { filename, contentType } = req.body;
      const ext = filename.split('.').pop() || 'jpg';
      const key = `uploads/${req.user!.userId}/${uuid()}.${ext}`;

      const s3 = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
        // endpoint: process.env.R2_ENDPOINT,
        // forcePathStyle: true,
      });

      const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME!,
        Key: key,
        ContentType: contentType
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      const publicUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;

      res.json({ uploadUrl, publicUrl, key });
    } catch (e) {
      next(e);
    }
  }
};
