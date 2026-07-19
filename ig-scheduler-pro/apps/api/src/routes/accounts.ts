import { Router } from 'express';
import { accountsController, connectSchema } from '../controllers/accountsController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authMiddleware);
router.post('/connect', validate(connectSchema), accountsController.connectAccount);
router.get('/', accountsController.getAccount);
router.delete('/', accountsController.disconnectAccount);

export default router;
