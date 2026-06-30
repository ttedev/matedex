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