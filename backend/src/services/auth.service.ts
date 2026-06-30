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