import { prisma } from '../lib/prisma';
import type { BananaSize, Category } from '@prisma/client';

export interface CreatePlanInput {
  partnerName: string;
  partnerAge?: number;
  bananaSize?: BananaSize;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  description?: string;
  score?: number;
  planDate?: Date;
  category?: Category;
  tagIds?: string[];
}

export async function getPlans(userId: string, category?: Category) {
  return prisma.plan.findMany({
    where: { userId, ...(category ? { category } : {}) },
    include: {
      tags: { include: { tag: true } },
      photos: { select: { id: true, filePath: true, isNsfw: true, mimeType: true } },
    },
    orderBy: { planDate: 'desc' },
  });
}

export async function getPlanById(planId: string, userId: string) {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    include: {
      tags: { include: { tag: true } },
      photos: true,
    },
  });
  if (!plan) throw new Error('Plan introuvable.');
  return plan;
}

export async function createPlan(userId: string, input: CreatePlanInput) {
  const { tagIds, ...data } = input;
  return prisma.plan.create({
    data: {
      ...data,
      userId,
      tags: tagIds
        ? { create: tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: {
      tags: { include: { tag: true } },
      photos: true,
    },
  });
}

export async function updatePlan(planId: string, userId: string, input: Partial<CreatePlanInput>) {
  // Vérifier que le plan appartient à l'utilisateur
  const existing = await prisma.plan.findFirst({ where: { id: planId, userId } });
  if (!existing) throw new Error('Plan introuvable.');

  const { tagIds, ...data } = input;

  return prisma.plan.update({
    where: { id: planId },
    data: {
      ...data,
      ...(tagIds !== undefined
        ? {
            tags: {
              deleteMany: {},
              create: tagIds.map((tagId) => ({ tagId })),
            },
          }
        : {}),
    },
    include: {
      tags: { include: { tag: true } },
      photos: true,
    },
  });
}

export async function deletePlan(planId: string, userId: string) {
  const existing = await prisma.plan.findFirst({ where: { id: planId, userId } });
  if (!existing) throw new Error('Plan introuvable.');
  await prisma.plan.delete({ where: { id: planId } });
}