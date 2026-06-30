import { Router } from 'express';
import * as PlansController from '../controllers/plans.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', PlansController.getPlans);
router.post('/', PlansController.createPlan);
router.get('/:id', PlansController.getPlan);
router.patch('/:id', PlansController.updatePlan);
router.delete('/:id', PlansController.deletePlan);

export default router;