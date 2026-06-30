import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  title: z.string().max(100).optional(),
});

export async function getProfile(req: Request, res: Response): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { id: true, email: true, displayName: true, avatarUrl: true, title: true, createdAt: true },
  });
  if (!user) {
    res.status(404).json({ error: 'Utilisateur introuvable.' });
    return;
  }
  res.json({ user });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.sub },
    data: parsed.data,
    select: { id: true, email: true, displayName: true, avatarUrl: true, title: true },
  });
  res.json({ user });
}

export async function getStats(req: Request, res: Response): Promise<void> {
  const userId = req.user!.sub;

  const [totalPlans, tagFrequency, plansByCategory] = await Promise.all([
    // Total des plans
    prisma.plan.count({ where: { userId } }),

    // Tags les plus utilisés (top 5)
    prisma.planTag.groupBy({
      by: ['tagId'],
      where: { plan: { userId } },
      _count: { tagId: true },
      orderBy: { _count: { tagId: 'desc' } },
      take: 5,
    }),

    // Répartition par catégorie
    prisma.plan.groupBy({
      by: ['category'],
      where: { userId },
      _count: { category: true },
    }),
  ]);

  // Résoudre les noms des tags
  const tagIds = tagFrequency.map((t) => t.tagId);
  const tags = await prisma.tag.findMany({ where: { id: { in: tagIds } } });
  const tagMap = Object.fromEntries(tags.map((t) => [t.id, t.name]));

  const favoriteTags = tagFrequency.map((t) => ({
    name: tagMap[t.tagId] ?? 'Inconnu',
    count: t._count.tagId,
  }));

  res.json({
    stats: {
      totalPlans,
      favoriteTags,
      plansByCategory: plansByCategory.map((c) => ({
        category: c.category,
        count: c._count.category,
      })),
    },
  });
}