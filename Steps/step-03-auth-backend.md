# Step 03 — Backend : Authentification (JWT + OAuth)

## Objectif
Implémenter toute la couche d'authentification :
- Inscription / connexion par email + mot de passe (JWT)
- OAuth Google, Facebook, Apple (via Passport.js)
- Middleware de protection des routes

## Prérequis
- Step 02 complété (schéma DB + migrations)
- Variables d'env `JWT_SECRET`, `GOOGLE_CLIENT_ID`, etc. configurées dans `backend/.env`

---

## 1. Middleware de Vérification JWT

### `backend/src/middleware/auth.middleware.ts`
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload } from '../lib/types';

// Étend le type Request pour y attacher l'utilisateur authentifié
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant ou invalide.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token expiré ou invalide.' });
  }
}
```

---

## 2. Service Auth

### `backend/src/services/auth.service.ts`
```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import type { SafeUser, JwtPayload } from '../lib/types';
import type { Provider } from '@prisma/client';

const BCRYPT_ROUNDS = 12;

// ---- Helpers ----

function generateToken(user: SafeUser): string {
  const payload: JwtPayload = { sub: user.id, email: user.email };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

function sanitizeUser(user: { id: string; email: string; displayName: string; avatarUrl: string | null; title: string; createdAt: Date; updatedAt: Date }): SafeUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    title: user.title,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ---- Inscription email/password ----

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: SafeUser; token: string }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('Un compte existe déjà avec cet email.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, passwordHash, displayName },
  });

  return { user: sanitizeUser(user), token: generateToken(sanitizeUser(user)) };
}

// ---- Connexion email/password ----

export async function loginWithEmail(
  email: string,
  password: string
): Promise<{ user: SafeUser; token: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new Error('Email ou mot de passe incorrect.');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Email ou mot de passe incorrect.');
  }

  return { user: sanitizeUser(user), token: generateToken(sanitizeUser(user)) };
}

// ---- Connexion / Inscription OAuth ----

export async function findOrCreateOAuthUser(params: {
  provider: Provider;
  providerId: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}): Promise<{ user: SafeUser; token: string }> {
  const { provider, providerId, email, displayName, avatarUrl } = params;

  // Chercher un compte OAuth existant
  let oauthAccount = await prisma.oAuthAccount.findUnique({
    where: { provider_providerId: { provider, providerId } },
    include: { user: true },
  });

  if (oauthAccount) {
    return {
      user: sanitizeUser(oauthAccount.user),
      token: generateToken(sanitizeUser(oauthAccount.user)),
    };
  }

  // Chercher un utilisateur existant par email et lier le compte OAuth
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: { email, displayName, avatarUrl },
    });
  }

  await prisma.oAuthAccount.create({
    data: { userId: user.id, provider, providerId },
  });

  return { user: sanitizeUser(user), token: generateToken(sanitizeUser(user)) };
}
```

---

## 3. Controller Auth

### `backend/src/controllers/auth.controller.ts`
```typescript
import { Request, Response } from 'express';
import { z } from 'zod';
import * as AuthService from '../services/auth.service';
import { env } from '../config/env';

const registerSchema = z.object({
  email: z.string().email('Email invalide.'),
  password: z.string().min(8, 'Le mot de passe doit faire au moins 8 caractères.'),
  displayName: z.string().min(2, 'Le nom doit faire au moins 2 caractères.').max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const { user, token } = await AuthService.registerWithEmail(
      parsed.data.email,
      parsed.data.password,
      parsed.data.displayName
    );
    res.status(201).json({ user, token });
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const { user, token } = await AuthService.loginWithEmail(
      parsed.data.email,
      parsed.data.password
    );
    res.status(200).json({ user, token });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}

// Appelé après le callback OAuth — redirige vers le frontend avec le token
export function oauthCallback(req: Request, res: Response): void {
  const user = req.user as any;
  if (!user?.token) {
    res.redirect(`${env.FRONTEND_URL}/login?error=oauth_failed`);
    return;
  }
  // Rediriger avec le token dans l'URL (récupéré par le frontend)
  res.redirect(`${env.FRONTEND_URL}/oauth-callback?token=${user.token}`);
}

export function getMe(req: Request, res: Response): void {
  res.json({ user: req.user });
}
```

---

## 4. Configuration Passport.js

### `backend/src/config/passport.ts`
```typescript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import AppleStrategy from 'passport-apple';
import { env } from './env';
import * as AuthService from '../services/auth.service';

const BACKEND_URL = `http://localhost:${env.PORT}`;

// ---- Google ----
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${BACKEND_URL}/auth/google/callback`,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('Email non disponible'), undefined);

          const result = await AuthService.findOrCreateOAuthUser({
            provider: 'google',
            providerId: profile.id,
            email,
            displayName: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value,
          });
          return done(null, result);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

// ---- Facebook ----
if (env.FACEBOOK_APP_ID && env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: env.FACEBOOK_APP_ID,
        clientSecret: env.FACEBOOK_APP_SECRET,
        callbackURL: `${BACKEND_URL}/auth/facebook/callback`,
        profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('Email non disponible'), undefined);

          const result = await AuthService.findOrCreateOAuthUser({
            provider: 'facebook',
            providerId: profile.id,
            email,
            displayName: `${profile.name?.givenName} ${profile.name?.familyName}`.trim(),
            avatarUrl: profile.photos?.[0]?.value,
          });
          return done(null, result);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

// ---- Apple ----
if (env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY) {
  passport.use(
    new AppleStrategy(
      {
        clientID: env.APPLE_CLIENT_ID,
        teamID: env.APPLE_TEAM_ID,
        keyID: env.APPLE_KEY_ID,
        privateKeyString: env.APPLE_PRIVATE_KEY,
        callbackURL: `${BACKEND_URL}/auth/apple/callback`,
        scope: ['name', 'email'],
      },
      async (_accessToken, _refreshToken, _idToken, profile, done) => {
        try {
          const email = profile.email;
          if (!email) return done(new Error('Email non disponible'), undefined);

          const result = await AuthService.findOrCreateOAuthUser({
            provider: 'apple',
            providerId: profile.id,
            email,
            displayName: profile.name?.firstName ?? 'Utilisateur Apple',
          });
          return done(null, result);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

export default passport;
```

---

## 5. Routes Auth

### `backend/src/routes/auth.routes.ts`
```typescript
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
```

---

## 6. Branchement dans `index.ts`

Modifier `backend/src/index.ts` pour ajouter :

```typescript
import passport from './config/passport';
import authRoutes from './routes/auth.routes';

// Après les middlewares existants :
app.use(passport.initialize());
app.use('/auth', authRoutes);
```

---

## 7. Tests Manuel des Endpoints

```bash
# Inscription
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"motdepasse123","displayName":"Alex"}'
# → { "user": {...}, "token": "eyJ..." }

# Connexion
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"motdepasse123"}'
# → { "user": {...}, "token": "eyJ..." }

# Profil courant (remplacer TOKEN par le token obtenu)
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer TOKEN"
# → { "user": { "sub": "...", "email": "..." } }
```

---

## Résultat Attendu

- `POST /auth/register` crée un utilisateur et retourne un JWT.
- `POST /auth/login` vérifie les credentials et retourne un JWT.
- `GET /auth/google` redirige vers Google, le callback crée/connecte l'utilisateur et redirige vers le frontend avec le token.
- `GET /auth/me` (avec Bearer token) retourne le payload JWT.
- Un token invalide sur n'importe quelle route protégée retourne 401.
