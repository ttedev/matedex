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