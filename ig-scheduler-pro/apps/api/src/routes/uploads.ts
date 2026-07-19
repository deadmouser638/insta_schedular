import { Router } from 'express';
import { uploadsController, presignSchema } from '../controllers/uploadsController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authMiddleware);
router.post('/presign', validate(presignSchema), uploadsController.presign);

export default router;
