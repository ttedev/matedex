import { Request, Response } from 'express';
import { z } from 'zod';
import * as PlansService from '../services/plans.service';
import type { BananaSize, Category } from '@prisma/client';

const createPlanSchema = z.object({
  partnerName: z.string().min(1).max(100),
  partnerAge: z.number().int().min(18).max(99).optional(),
  bananaSize: z.enum(['S', 'M', 'L', 'XL']).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  locationName: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
  score: z.number().int().min(0).max(20).optional(),
  planDate: z.string().datetime().optional(),
  category: z.enum(['plage', 'soiree', 'festival', 'autre']).optional(),
  tagIds: z.array(z.string()).optional(),
});

export async function getPlans(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;
  const category = req.query.category as Category | undefined;
  const plans = await PlansService.getPlans(userId, category);
  res.json({ plans });
}

export async function getPlan(req: Request, res: Response): Promise<void> {
  try {
    const plan = await PlansService.getPlanById(req.params.id, req.user!.sub);
    res.json({ plan });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function createPlan(req: Request, res: Response): Promise<void> {
  const parsed = createPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const plan = await PlansService.createPlan(req.user!.sub, {
    ...parsed.data,
    planDate: parsed.data.planDate ? new Date(parsed.data.planDate) : undefined,
    bananaSize: parsed.data.bananaSize as BananaSize | undefined,
    category: parsed.data.category as Category | undefined,
  });
  res.status(201).json({ plan });
}

export async function updatePlan(req: Request, res: Response): Promise<void> {
  const parsed = createPlanSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const plan = await PlansService.updatePlan(req.params.id, req.user!.sub, {
      ...parsed.data,
      planDate: parsed.data.planDate ? new Date(parsed.data.planDate) : undefined,
    });
    res.json({ plan });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function deletePlan(req: Request, res: Response): Promise<void> {
  try {
    await PlansService.deletePlan(req.params.id, req.user!.sub);
    res.status(204).send();
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}