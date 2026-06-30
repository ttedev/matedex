import { Router } from 'express';
import * as TagsController from '../controllers/tags.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', TagsController.getTags);
router.post('/', TagsController.createTag);

export default router;