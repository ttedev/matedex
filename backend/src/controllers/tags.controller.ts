import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export async function getTags(req: Request, res: Response): Promise<void> {
  // Tags de l'utilisateur + tags système
  const tags = await prisma.tag.findMany({
    where: {
      OR: [
        { userId: req.user!.sub },
        { isSystem: true },
      ],
    },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });
  res.json({ tags });
}

export async function createTag(req: Request, res: Response): Promise<void> {
  const parsed = z.object({ name: z.string().min(1).max(50) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  // Empêcher les doublons
  const existing = await prisma.tag.findUnique({
    where: { name_userId: { name: parsed.data.name, userId: req.user!.sub } },
  });
  if (existing) {
    res.status(409).json({ error: 'Ce tag existe déjà.' });
    return;
  }

  const tag = await prisma.tag.create({
    data: { name: parsed.data.name, userId: req.user!.sub },
  });
  res.status(201).json({ tag });
}