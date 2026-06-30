import { Router } from 'express';
import passport from '../config/passport';
import * as AuthController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// ---- Email / Password ----
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// ---- OAuth Google ----
router.get('/google', passport.authenticate('google', { session: false, scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/failure' }),
  AuthController.oauthCallback
);

// ---- OAuth Facebook ----
router.get('/facebook', passport.authenticate('facebook', { session: false, scope: ['email'] }));
router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/auth/failure' }),
  AuthController.oauthCallback
);

// ---- OAuth Apple ----
router.post('/apple', passport.authenticate('apple', { session: false }));
router.post('/apple/callback',
  passport.authenticate('apple', { session: false, failureRedirect: '/auth/failure' }),
  AuthController.oauthCallback
);

// ---- Failure ----
router.get('/failure', (_req, res) => {
  res.status(401).json({ error: 'Authentification OAuth échouée.' });
});

// ---- Profil courant (protégé) ----
router.get('/me', requireAuth, AuthController.getMe);

export default router;