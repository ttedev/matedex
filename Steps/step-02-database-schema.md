# Step 02 — Schéma Base de Données (Prisma + PostgreSQL)

## Objectif
Définir le schéma de données complet de Matedex avec Prisma, puis générer et appliquer la migration initiale.

## Prérequis
- Step 01 complété (backend initialisé)
- PostgreSQL en cours d'exécution (via Docker ou local)
- `backend/.env` configuré avec `DATABASE_URL`

---

## 1. Schéma Prisma Complet

Créer / remplacer le fichier `backend/prisma/schema.prisma` :

```prisma
// backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================
// UTILISATEUR
// ============================================================

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String?   // Null si connexion OAuth uniquement
  displayName  String
  avatarUrl    String?
  title        String    @default("Explorateur Estival")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Relations OAuth
  oauthAccounts OAuthAccount[]

  // Contenu
  plans   Plan[]
  tags    Tag[]     // Tags personnalisés créés par l'utilisateur

  @@map("users")
}

// ============================================================
// COMPTES OAUTH LIÉS À UN UTILISATEUR
// ============================================================

model OAuthAccount {
  id           String   @id @default(cuid())
  userId       String
  provider     Provider
  providerId   String   // ID unique retourné par le provider OAuth
  accessToken  String?
  refreshToken String?
  createdAt    DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerId])
  @@map("oauth_accounts")
}

enum Provider {
  google
  facebook
  apple
}

// ============================================================
// PLAN (rencontre)
// ============================================================

model Plan {
  id          String    @id @default(cuid())
  userId      String
  partnerName String                       // Nom ou alias du partenaire
  partnerAge  Int?                         // Âge (slider 18-99)
  bananaSize  BananaSize?                  // Taille (sélecteur visuel banane)
  latitude    Float?                       // Coordonnée GPS
  longitude   Float?                       // Coordonnée GPS
  locationName String?                     // Adresse lisible (ex: "Paris, France")
  description String?                      // Texte libre "détails croustillants"
  score       Int?                         // Note /20 (0-20)
  planDate    DateTime  @default(now())    // Date de la rencontre
  category    Category  @default(autre)    // Catégorie de l'événement
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tags   PlanTag[]
  photos Photo[]

  @@map("plans")
}

enum BananaSize {
  S
  M
  L
  XL
}

enum Category {
  plage
  soiree
  festival
  autre
}

// ============================================================
// TAGS
// ============================================================

model Tag {
  id        String    @id @default(cuid())
  name      String
  userId    String    // Tag appartenant à un utilisateur (ou null si système)
  isSystem  Boolean   @default(false)  // Tags prédéfinis (bbk, uro, embrasser, public)
  createdAt DateTime  @default(now())

  user  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  plans PlanTag[]

  @@unique([name, userId])
  @@map("tags")
}

model PlanTag {
  planId String
  tagId  String

  plan Plan @relation(fields: [planId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([planId, tagId])
  @@map("plan_tags")
}

// ============================================================
// PHOTOS
// ============================================================

model Photo {
  id        String    @id @default(cuid())
  planId    String
  filePath  String    // Chemin relatif depuis UPLOADS_DIR
  isNsfw    Boolean   @default(false)   // true = photo privée / NSFW
  mimeType  String                      // image/jpeg, image/png, etc.
  sizeBytes Int
  createdAt DateTime  @default(now())

  plan Plan @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@map("photos")
}
```

---

## 2. Tags Système (seed)

Créer le fichier `backend/prisma/seed.ts` :

```typescript
// backend/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SYSTEM_TAGS = ['bbk', 'uro', 'embrasser', 'public', 'trio', 'muscu', 'actif', 'passif'];

async function main() {
  console.log('🌱 Seed Matedex...');

  // Créer un utilisateur système pour héberger les tags système
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@matedex.internal' },
    update: {},
    create: {
      email: 'system@matedex.internal',
      displayName: 'Système',
      passwordHash: await bcrypt.hash(Math.random().toString(36), 12),
    },
  });

  // Créer les tags système
  for (const tagName of SYSTEM_TAGS) {
    await prisma.tag.upsert({
      where: { name_userId: { name: tagName, userId: systemUser.id } },
      update: {},
      create: {
        name: tagName,
        userId: systemUser.id,
        isSystem: true,
      },
    });
  }

  console.log(`✅ ${SYSTEM_TAGS.length} tags système créés.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Ajouter dans `backend/package.json` :
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

---

## 3. Commandes à Exécuter

```bash
cd backend

# 1. Installer les dépendances si ce n'est pas fait
npm install

# 2. Générer le client Prisma
npx prisma generate

# 3. Créer et appliquer la migration initiale
npx prisma migrate dev --name init

# 4. Lancer le seed (tags système)
npx prisma db seed

# 5. (Optionnel) Ouvrir Prisma Studio pour visualiser les données
npx prisma studio
```

---

## 4. Types TypeScript Dérivés

Ajouter le fichier `backend/src/lib/types.ts` pour exporter des types utilitaires :

```typescript
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
```

---

## 5. Relations et Contraintes

| Relation | Cardinalité | On Delete |
|---|---|---|
| User → Plan | 1 → N | Cascade |
| User → Tag | 1 → N | Cascade |
| User → OAuthAccount | 1 → N | Cascade |
| Plan → Photo | 1 → N | Cascade |
| Plan ↔ Tag (via PlanTag) | N → N | Cascade |

---

## Résultat Attendu

- Migration appliquée avec succès (`prisma/migrations/` créé).
- Client Prisma généré (`node_modules/.prisma/`).
- Base de données contient les tables : `users`, `oauth_accounts`, `plans`, `plan_tags`, `tags`, `photos`.
- Les 8 tags système sont présents dans la table `tags`.
