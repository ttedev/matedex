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