# Step 04 — Backend : API REST (Plans, Photos, Profil)

## Objectif
Implémenter l'ensemble des endpoints API pour gérer :
- Les plans (CRUD complet)
- Les photos (upload classique + NSFW, consultation sécurisée)
- Le profil utilisateur et ses statistiques
- Les tags

## Prérequis
- Step 03 complété (auth fonctionnelle)
- Toutes les routes nécessitent le middleware `requireAuth`

---

## Table des Endpoints

| Méthode | Route | Description |
|---|---|---|
| GET | `/plans` | Liste des plans de l'utilisateur connecté |
| POST | `/plans` | Créer un plan |
| GET | `/plans/:id` | Détails d'un plan |
| PATCH | `/plans/:id` | Modifier un plan |
| DELETE | `/plans/:id` | Supprimer un plan |
| GET | `/tags` | Tags de l'utilisateur + tags système |
| POST | `/tags` | Créer un tag personnalisé |
| POST | `/photos/upload` | Uploader une photo (classique ou NSFW) |
| GET | `/photos/private/:filename` | Servir une photo NSFW (JWT requis) |
| DELETE | `/photos/:id` | Supprimer une photo |
| GET | `/profile` | Profil de l'utilisateur connecté |
| PATCH | `/profile` | Modifier le profil |
| GET | `/profile/stats` | Statistiques estivales |

---

## 1. Middleware Upload (Multer)

### `backend/src/middleware/upload.middleware.ts`
```typescript
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { Request } from 'express';
import { env } from '../config/env';

const MAX_SIZE = env.MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function buildStorage(subfolder: 'public' | 'private') {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(env.UPLOADS_DIR, subfolder));
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, uniqueName);
    },
  });
}

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Seuls JPEG, PNG, WebP et GIF sont acceptés.'));
  }
}

export const uploadPublic = multer({
  storage: buildStorage('public'),
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});

export const uploadPrivate = multer({
  storage: buildStorage('private'),
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});
```

---

## 2. Service Plans

### `backend/src/services/plans.service.ts`
```typescript
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
```

---

## 3. Controller Plans

### `backend/src/controllers/plans.controller.ts`
```typescript
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
```

---

## 4. Controller Photos

### `backend/src/controllers/photos.controller.ts`
```typescript
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

export async function uploadPhoto(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: 'Aucun fichier reçu.' });
    return;
  }

  const { planId, isNsfw } = req.body;
  if (!planId) {
    // Supprimer le fichier uploadé si aucun plan
    fs.unlinkSync(req.file.path);
    res.status(400).json({ error: 'planId requis.' });
    return;
  }

  // Vérifier que le plan appartient à l'utilisateur
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId: req.user!.sub },
  });
  if (!plan) {
    fs.unlinkSync(req.file.path);
    res.status(404).json({ error: 'Plan introuvable.' });
    return;
  }

  const nsfw = isNsfw === 'true' || isNsfw === true;
  const subfolder = nsfw ? 'private' : 'public';
  const filePath = `${subfolder}/${req.file.filename}`;

  const photo = await prisma.photo.create({
    data: {
      planId,
      filePath,
      isNsfw: nsfw,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    },
  });

  res.status(201).json({ photo });
}

// Servir les photos privées (NSFW) uniquement après vérification JWT
export function servePrivatePhoto(req: Request, res: Response): void {
  const filename = req.params.filename;

  // Sécurité : empêcher le path traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(env.UPLOADS_DIR, 'private', safeFilename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Photo introuvable.' });
    return;
  }

  res.sendFile(filePath);
}

export async function deletePhoto(req: Request, res: Response): Promise<void> {
  const photo = await prisma.photo.findUnique({ where: { id: req.params.id } });
  if (!photo) {
    res.status(404).json({ error: 'Photo introuvable.' });
    return;
  }

  // Vérifier que l'utilisateur possède le plan associé
  const plan = await prisma.plan.findFirst({
    where: { id: photo.planId, userId: req.user!.sub },
  });
  if (!plan) {
    res.status(403).json({ error: 'Accès refusé.' });
    return;
  }

  // Supprimer le fichier physique
  const filePath = path.join(env.UPLOADS_DIR, photo.filePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.photo.delete({ where: { id: req.params.id } });
  res.status(204).send();
}
```

---

## 5. Controller Profil & Statistiques

### `backend/src/controllers/profile.controller.ts`
```typescript
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
```

---

## 6. Controller Tags

### `backend/src/controllers/tags.controller.ts`
```typescript
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
```

---

## 7. Routes

### `backend/src/routes/plans.routes.ts`
```typescript
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
```

### `backend/src/routes/photos.routes.ts`
```typescript
import { Router } from 'express';
import * as PhotosController from '../controllers/photos.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { uploadPublic, uploadPrivate } from '../middleware/upload.middleware';

const router = Router();
router.use(requireAuth);

// Upload : utilise uploadPublic ou uploadPrivate selon isNsfw dans le body
// On utilise uploadPrivate par défaut et on gère la logique dans le controller
router.post('/upload', uploadPrivate.single('photo'), PhotosController.uploadPhoto);

// Servir les photos privées
router.get('/private/:filename', PhotosController.servePrivatePhoto);

router.delete('/:id', PhotosController.deletePhoto);

export default router;
```

### `backend/src/routes/profile.routes.ts`
```typescript
import { Router } from 'express';
import * as ProfileController from '../controllers/profile.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', ProfileController.getProfile);
router.patch('/', ProfileController.updateProfile);
router.get('/stats', ProfileController.getStats);

export default router;
```

### `backend/src/routes/tags.routes.ts`
```typescript
import { Router } from 'express';
import * as TagsController from '../controllers/tags.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', TagsController.getTags);
router.post('/', TagsController.createTag);

export default router;
```

---

## 8. Branchement Final dans `index.ts`

Ajouter dans `backend/src/index.ts` après le branchement de l'auth :

```typescript
import plansRoutes from './routes/plans.routes';
import photosRoutes from './routes/photos.routes';
import profileRoutes from './routes/profile.routes';
import tagsRoutes from './routes/tags.routes';

app.use('/plans', plansRoutes);
app.use('/photos', photosRoutes);
app.use('/profile', profileRoutes);
app.use('/tags', tagsRoutes);
```

---

## Résultat Attendu

Tous les endpoints listés dans la table sont opérationnels et retournent les données correctes. La vérification d'appartenance (un utilisateur ne peut voir/modifier que ses propres plans) est en place. Les photos NSFW ne sont accessibles qu'avec un JWT valide.
