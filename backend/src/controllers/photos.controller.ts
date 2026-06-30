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

  if (!nsfw) {
    const targetPath = path.resolve(env.UPLOADS_DIR, 'public', req.file.filename);
    try {
      fs.renameSync(req.file.path, targetPath);
    } catch {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Impossible de stocker la photo publique.' });
      return;
    }
  }

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

export async function servePublicPhoto(req: Request, res: Response): Promise<void> {
  const filename = path.basename(req.params.filename);
  const publicPath = path.resolve(env.UPLOADS_DIR, 'public', filename);

  if (fs.existsSync(publicPath)) {
    res.sendFile(publicPath);
    return;
  }

  const photo = await prisma.photo.findFirst({
    where: {
      filePath: `public/${filename}`,
      isNsfw: false,
    },
    select: { id: true },
  });

  if (!photo) {
    res.status(404).json({ error: 'Photo introuvable.' });
    return;
  }

  const legacyPath = path.resolve(env.UPLOADS_DIR, 'private', filename);
  if (!fs.existsSync(legacyPath)) {
    res.status(404).json({ error: 'Photo introuvable.' });
    return;
  }

  res.sendFile(legacyPath);
}

// Servir les photos privées (NSFW) uniquement après vérification JWT
export function servePrivatePhoto(req: Request, res: Response): void {
  const filename = req.params.filename;

  // Sécurité : empêcher le path traversal
  const safeFilename = path.basename(filename);
  // path.resolve garantit un chemin absolu même si UPLOADS_DIR est relatif
  const filePath = path.resolve(env.UPLOADS_DIR, 'private', safeFilename);

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
  const filePath = path.resolve(env.UPLOADS_DIR, photo.filePath);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await prisma.photo.delete({ where: { id: req.params.id } });
  res.status(204).send();
}