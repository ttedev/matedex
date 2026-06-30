# Matedex — Contexte Global du Projet

## Application
Matedex est une application web **mobile-first** pour la communauté gay permettant de répertorier des rencontres estivales. Approche joyeuse, inclusive et décomplexée.

## Stack Technique
- **Frontend** : React 18 + Vite + TypeScript + TailwindCSS + React Router v6 + TanStack Query v5 + Axios
- **Backend** : Node.js 20 + Express 4 + TypeScript + Prisma 5 + PostgreSQL 16
- **Auth** : JWT (email/password) + Passport.js (OAuth Google, Facebook, Apple)
- **Upload** : Multer → volume Docker local (`/uploads/public/` et `/uploads/private/`)
- **Carte** : Leaflet + React-Leaflet + Nominatim (OpenStreetMap, gratuit)
- **Infra** : Docker Compose + Nginx reverse proxy

## Structure Monorepo
```
matedex/
├── frontend/      (React SPA)
├── backend/       (Express API)
├── Steps/         (Documentation d'implémentation étape par étape)
├── Spec/          (Maquettes HTML de référence)
└── docker-compose.yml
```

## Design System — "Summer Joy & Inclusivity"
- **Palette** : `primary: #b90040` (rose vif) · `secondary: #006b5f` (menthe) · `tertiary: #974400` (orange) · `surface: #fff8f7` · `on-surface: #281719`
- **Typo** : Montserrat partout. `display-lg-mobile: 36px/900` · `headline-lg: 32px/700` · `body-md: 16px/400`
- **Border radius** : `sm:0.5rem` · `DEFAULT:1rem` · `md:1.5rem` · `lg:2rem` · `xl:3rem` · `full:9999px`
- **Animations** : bounce lent (4s ease-in-out), active:scale-95 sur les boutons

## Conventions de Code
- TypeScript strict partout, pas de `any` sauf quand inévitable
- Les routes API backend sont préfixées `/auth`, `/plans`, `/photos`, `/profile`, `/tags`
- JWT stocké dans `localStorage` clé `"matedex_token"` — envoyé en header `Authorization: Bearer <token>`
- Les photos NSFW sont dans `/uploads/private/` et servies uniquement après vérification JWT
- Validation des payloads avec **Zod** côté backend et côté frontend
- Tous les textes de l'interface sont en **français**
- Mobile-first : les classes `md:` sont des améliorations optionnelles

## Sécurité
- Mot de passe haché avec `bcryptjs` (coût 12)
- Vérification d'appartenance (un user ne peut accéder qu'à ses propres plans/photos)
- Path traversal prévenu sur les routes de fichiers
- CORS restreint à `FRONTEND_URL`
- Helmet activé sur le backend

## Fichiers de Référence
- Maquettes HTML : `Spec/*/code.html`
- Plan d'implémentation : `Steps/step-00-architecture-overview.md` (vue globale)
- Chaque step détaille un fichier de code à créer avec son contenu exact
