import { Router } from 'express';
import { settingsController, settingsSchema } from '../controllers/settingsController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authMiddleware);
router.get('/', settingsController.getSettings);
router.put('/', validate(settingsSchema), settingsController.updateSettings);

export default router;
