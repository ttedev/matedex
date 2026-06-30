# Step 00 — Architecture & Vue d'Ensemble Technique

## Contexte du Projet

**Matedex** est une application web mobile-first permettant à la communauté gay de répertorier et organiser ses rencontres estivales. L'interface est joyeuse, inclusive et décomplexée.

---

## Stack Technique Retenu

### Frontend
| Outil | Version recommandée | Rôle |
|---|---|---|
| React | 18.x | Framework UI |
| Vite | 5.x | Bundler / dev server |
| TypeScript | 5.x | Typage statique |
| TailwindCSS | 3.x | Styles utilitaires |
| React Router | 6.x | Navigation SPA |
| TanStack Query (React Query) | 5.x | Gestion des requêtes / cache serveur |
| Axios | 1.x | Client HTTP |
| React-Leaflet + Leaflet | 4.x / 1.9.x | Carte interactive (OpenStreetMap) |
| React Hook Form | 7.x | Gestion des formulaires |
| Zod | 3.x | Validation des données côté client |

### Backend
| Outil | Version recommandée | Rôle |
|---|---|---|
| Node.js | 20.x LTS | Runtime |
| Express | 4.x | Framework HTTP |
| TypeScript | 5.x | Typage statique |
| Prisma | 5.x | ORM + migrations |
| PostgreSQL | 16.x | Base de données relationnelle |
| Passport.js | 0.7.x | Authentification OAuth |
| passport-google-oauth20 | 2.x | OAuth Google |
| passport-facebook | 3.x | OAuth Facebook |
| passport-apple | 2.x | OAuth Apple |
| jsonwebtoken | 9.x | Génération / vérification JWT |
| bcryptjs | 2.x | Hachage des mots de passe |
| Multer | 1.x | Upload de fichiers (photos) |
| cors | 2.x | Headers CORS |
| helmet | 7.x | Sécurité HTTP headers |
| zod | 3.x | Validation des payloads API |

### Infrastructure
| Outil | Rôle |
|---|---|
| Docker Compose | Orchestration locale (dev + prod) |
| Nginx (image officielle) | Reverse proxy + serve frontend build |
| Volume Docker nommé | Stockage photos sur disque local |

---

## Structure des Dossiers

```
matedex/
├── docker-compose.yml          # Orchestration globale
├── nginx.conf                  # Config Nginx reverse proxy
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── router.tsx           # React Router config
│       ├── api/                 # Fonctions axios (par domaine)
│       │   ├── auth.ts
│       │   ├── plans.ts
│       │   ├── photos.ts
│       │   └── profile.ts
│       ├── components/          # Composants réutilisables
│       │   ├── ui/              # Boutons, inputs, cards (design system)
│       │   ├── BottomNav.tsx
│       │   ├── TagPicker.tsx
│       │   ├── BananaSlider.tsx
│       │   └── MapPicker.tsx
│       ├── contexts/
│       │   └── AuthContext.tsx
│       ├── hooks/
│       │   └── useAuth.ts
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── AddPlanPage.tsx
│       │   ├── MyPlansPage.tsx
│       │   ├── PlanDetailPage.tsx
│       │   └── ProfilePage.tsx
│       └── styles/
│           └── index.css        # @tailwind directives
│
└── backend/
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/          # Généré automatiquement
    └── src/
        ├── index.ts             # Point d'entrée Express
        ├── config/
        │   └── env.ts           # Variables d'environnement validées
        ├── middleware/
        │   ├── auth.middleware.ts   # Vérification JWT
        │   ├── upload.middleware.ts # Multer config
        │   └── validate.middleware.ts # Validation Zod
        ├── routes/
        │   ├── auth.routes.ts
        │   ├── plans.routes.ts
        │   ├── photos.routes.ts
        │   └── profile.routes.ts
        ├── controllers/
        │   ├── auth.controller.ts
        │   ├── plans.controller.ts
        │   ├── photos.controller.ts
        │   └── profile.controller.ts
        ├── services/
        │   ├── auth.service.ts
        │   ├── plans.service.ts
        │   └── profile.service.ts
        └── lib/
            └── prisma.ts        # Instance Prisma singleton
```

---

## Ports et Services

| Service | Port interne | Port hôte (dev) |
|---|---|---|
| PostgreSQL | 5432 | 5432 |
| Backend (Express) | 3000 | 3000 |
| Frontend (Vite dev) | 5173 | 5173 |
| Nginx (prod) | 80 | 80 |

---

## Variables d'Environnement

Créer un fichier `.env` à la racine de chaque service. **Ne jamais commit ces fichiers.**

### `backend/.env`
```env
# Base de données
DATABASE_URL="postgresql://matedex:matedex_secret@db:5432/matedex_db"

# JWT
JWT_SECRET="CHANGE_ME_une_chaine_aleatoire_256bits"
JWT_EXPIRES_IN="7d"

# Serveur
PORT=3000
FRONTEND_URL="http://localhost:5173"

# OAuth Google
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# OAuth Facebook
FACEBOOK_APP_ID="..."
FACEBOOK_APP_SECRET="..."

# OAuth Apple
APPLE_CLIENT_ID="..."
APPLE_TEAM_ID="..."
APPLE_KEY_ID="..."
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Upload photos
UPLOADS_DIR="/app/uploads"
MAX_FILE_SIZE_MB=10
```

### `frontend/.env`
```env
VITE_API_URL="http://localhost:3000"
VITE_GOOGLE_OAUTH_URL="http://localhost:3000/auth/google"
VITE_FACEBOOK_OAUTH_URL="http://localhost:3000/auth/facebook"
VITE_APPLE_OAUTH_URL="http://localhost:3000/auth/apple"
```

---

## Flux d'Authentification

```
[Browser] → POST /auth/register   → JWT retourné dans la réponse JSON
[Browser] → POST /auth/login      → JWT retourné dans la réponse JSON
[Browser] → GET  /auth/google     → Redirect OAuth Google → callback → JWT
[Browser] → GET  /auth/facebook   → Redirect OAuth Facebook → callback → JWT
[Browser] → GET  /auth/apple      → Redirect OAuth Apple → callback → JWT

JWT stocké dans : localStorage (clé "matedex_token")
Envoyé via header : Authorization: Bearer <token>
```

---

## Sécurité (points critiques)

- Les photos **NSFW** sont stockées dans un dossier **séparé** (`/uploads/private/`) servi uniquement après vérification JWT côté backend.
- Les photos classiques sont dans `/uploads/public/` et peuvent être servies statiquement.
- Toutes les routes API (sauf `/auth/*`) requièrent un JWT valide.
- Les mots de passe sont hachés avec **bcryptjs** (coût 12).
- Les inputs sont validés avec **Zod** sur le backend avant tout traitement.
- Les headers HTTP sont sécurisés par **Helmet**.
- CORS est restreint à `FRONTEND_URL`.

---

## Design System (référence pour tous les écrans)

Le design system **"Summer Joy & Inclusivity"** est appliqué globalement.

### Couleurs principales
```
primary: #b90040        (rose vif — boutons, accents)
secondary: #006b5f      (vert menthe)
tertiary: #974400       (orange chaleureux)
surface: #fff8f7        (fond principal)
on-surface: #281719     (texte principal)
error: #ba1a1a
```

### Typographie
Toutes les polices : **Montserrat** (Google Fonts).
```
display-lg-mobile: 36px / 900
headline-lg: 32px / 700
headline-md: 24px / 700
body-lg: 18px / 500
body-md: 16px / 400
label-lg: 14px / 700 / letter-spacing: 0.05em
label-sm: 12px / 600
```

### Border Radius
```
sm: 0.5rem | DEFAULT: 1rem | md: 1.5rem | lg: 2rem | xl: 3rem | full: 9999px
```

---

## Ordre d'Implémentation Recommandé

1. **Step 01** — Scaffolding monorepo (structure des dossiers + configs)
2. **Step 02** — Schéma base de données (Prisma schema + migrations)
3. **Step 03** — Backend Auth (JWT + OAuth)
4. **Step 04** — Backend API REST (plans, photos, profil)
5. **Step 05** — Frontend setup (Tailwind design system + router + auth context)
6. **Step 06** — Écran Connexion
7. **Step 07** — Écran Dashboard
8. **Step 08** — Écran Ajouter un Plan (le plus complexe)
9. **Step 09** — Écran Mes Plans
10. **Step 10** — Écran Détails du Plan
11. **Step 11** — Écran Mon Profil
12. **Step 12** — Docker Compose + Nginx (déploiement)
