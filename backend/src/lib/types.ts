// backend/src/lib/types.ts
import type { User, Plan, Tag, Photo } from '@prisma/client';

// Type utilisateur sans le hash de mot de passe (à retourner dans les réponses API)
export type SafeUser = Omit<User, 'passwordHash'>;

// Plan avec ses relations incluses
export type PlanWithRelations = Plan & {
  tags: Array<{ tag: Tag }>;
  photos: Photo[];
  user: SafeUser;
};

// Payload JWT
export interface JwtPayload {
  sub: string;   // userId
  email: string;
  iat?: number;
  exp?: number;
}