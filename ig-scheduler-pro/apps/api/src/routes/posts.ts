import { Router } from 'express';
import { postsController, postSchema, patchPostSchema } from '../controllers/postsController';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authMiddleware);
router.get('/', postsController.listPosts);
router.post('/', validate(postSchema), postsController.createPost);
router.patch('/:id', validate(patchPostSchema), postsController.updatePost);
router.delete('/:id', postsController.deletePost);
router.post('/:id/publish', postsController.publishPost);
router.get('/:id/status', postsController.getPostStatus);

export default router;
