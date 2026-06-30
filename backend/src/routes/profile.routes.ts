import { Router } from 'express';
import * as ProfileController from '../controllers/profile.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', ProfileController.getProfile);
router.patch('/', ProfileController.updateProfile);
router.get('/stats', ProfileController.getStats);

export default router;