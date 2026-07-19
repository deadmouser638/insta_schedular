import { Router } from 'express';
import { captionsController, captionSchema } from '../controllers/captionsController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authMiddleware);
router.post('/', validate(captionSchema), captionsController.generateCaption);

export default router;
