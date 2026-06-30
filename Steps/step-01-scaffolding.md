# Step 01 — Scaffolding Monorepo

## Objectif
Créer la structure complète des dossiers et les fichiers de configuration de base pour le frontend et le backend. À la fin de cette étape, les deux projets doivent pouvoir démarrer (sans fonctionnalités).

## Prérequis
- Node.js 20+ installé
- npm 10+ ou pnpm 9+
- Docker et Docker Compose installés

---

## 1. Structure Racine

À la racine du dépôt `matedex/`, créer les fichiers suivants :

### `.gitignore` (racine)
```gitignore
node_modules/
.env
.env.local
dist/
build/
uploads/
*.log
```

### `.env.example` (racine — à documenter pour les contributeurs)
```env
# Copier dans backend/.env et frontend/.env
DATABASE_URL=postgresql://matedex:matedex_secret@localhost:5432/matedex_db
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
PORT=3000
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
UPLOADS_DIR=./uploads
MAX_FILE_SIZE_MB=10
VITE_API_URL=http://localhost:3000
```

---

## 2. Backend — Initialisation

### Commandes à exécuter
```bash
mkdir -p backend/src/{config,middleware,routes,controllers,services,lib}
mkdir -p backend/prisma
cd backend
npm init -y
```

### `backend/package.json`
```json
{
  "name": "matedex-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.14.0",
    "axios": "^1.7.0",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "passport": "^0.7.0",
    "passport-apple": "^2.0.2",
    "passport-facebook": "^3.0.0",
    "passport-google-oauth20": "^2.0.0",
    "passport-local": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/multer": "^1.4.11",
    "@types/node": "^20.14.0",
    "@types/passport": "^1.0.16",
    "@types/passport-facebook": "^3.0.3",
    "@types/passport-google-oauth20": "^2.0.16",
    "@types/passport-local": "^1.0.38",
    "prisma": "^5.14.0",
    "tsx": "^4.15.0",
    "typescript": "^5.4.5"
  }
}
```

### `backend/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### `backend/src/index.ts` (point d'entrée minimal)
```typescript
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';

const app = express();

// Sécurité
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les uploads publics statiquement
app.use('/uploads/public', express.static(env.UPLOADS_DIR + '/public'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(env.PORT, () => {
  console.log(`🚀 Backend Matedex démarré sur le port ${env.PORT}`);
});

export default app;
```

### `backend/src/config/env.ts`
```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET doit faire au moins 32 caractères'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().url(),
  UPLOADS_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

### `backend/src/lib/prisma.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### `backend/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
RUN mkdir -p /app/uploads/public /app/uploads/private
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

---

## 3. Frontend — Initialisation

### Commandes à exécuter
```bash
cd ..
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom @tanstack/react-query axios leaflet react-leaflet react-hook-form zod @hookform/resolvers
npm install -D @types/leaflet
```

### `frontend/tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Design System "Summer Joy & Inclusivity"
        primary: '#b90040',
        'on-primary': '#ffffff',
        'primary-container': '#e31754',
        'on-primary-container': '#fffbff',
        'primary-fixed': '#ffd9dc',
        'primary-fixed-dim': '#ffb2ba',
        'on-primary-fixed': '#400011',
        'on-primary-fixed-variant': '#910030',
        'inverse-primary': '#ffb2ba',
        secondary: '#006b5f',
        'on-secondary': '#ffffff',
        'secondary-container': '#76f4e0',
        'on-secondary-container': '#006f63',
        tertiary: '#974400',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#bb580d',
        'on-tertiary-container': '#fffbff',
        error: '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a',
        surface: '#fff8f7',
        'surface-dim': '#f2d3d5',
        'surface-bright': '#fff8f7',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#fff0f0',
        'surface-container': '#ffe9ea',
        'surface-container-high': '#ffe1e3',
        'surface-container-highest': '#fbdbdd',
        'on-surface': '#281719',
        'on-surface-variant': '#5c3f42',
        'surface-variant': '#fbdbdd',
        'surface-tint': '#bd0042',
        'inverse-surface': '#3f2b2d',
        'inverse-on-surface': '#ffeced',
        outline: '#906f72',
        'outline-variant': '#e5bdc0',
        background: '#fff8f7',
        'on-background': '#281719',
      },
      borderRadius: {
        sm: '0.5rem',
        DEFAULT: '1rem',
        md: '1.5rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px',
      },
      spacing: {
        xs: '4px',
        sm: '12px',
        base: '8px',
        md: '24px',
        lg: '40px',
        xl: '64px',
        'margin-mobile': '16px',
        'margin-desktop': '80px',
        gutter: '24px',
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '900' }],
        'display-lg-mobile': ['36px', { lineHeight: '44px', letterSpacing: '-0.01em', fontWeight: '900' }],
        'headline-lg': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '500' }],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.05em', fontWeight: '700' }],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### `frontend/src/styles/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;900&display=swap');
@import 'leaflet/dist/leaflet.css';

body {
  font-family: 'Montserrat', sans-serif;
  background-color: #fff8f7;
  color: #281719;
  overflow-x: hidden;
  -webkit-tap-highlight-color: transparent;
}

/* Scrollbar invisible sur mobile */
::-webkit-scrollbar {
  display: none;
}
```

### `frontend/src/main.tsx`
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

### `frontend/src/App.tsx` (squelette — sera complété à Step 05)
```tsx
import { AuthProvider } from './contexts/AuthContext';
import AppRouter from './router';

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
```

### `frontend/Dockerfile`
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### `frontend/nginx-frontend.conf`
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  gzip on;
  gzip_types text/plain text/css application/json application/javascript;
}
```

### `frontend/vite.config.ts`
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

---

## 4. Vérification

Après avoir créé tous les fichiers, vérifier que tout démarre :

```bash
# Backend
cd backend && npm install && npm run dev
# → "🚀 Backend Matedex démarré sur le port 3000"
# → GET http://localhost:3000/health doit retourner { status: "ok" }

# Frontend
cd ../frontend && npm install && npm run dev
# → Application visible sur http://localhost:5173
```

---

## Résultat Attendu

- Structure de dossiers complète créée.
- Backend Express démarre sans erreur sur le port 3000.
- Frontend Vite démarre sans erreur sur le port 5173.
- Les deux projets compilent en TypeScript sans erreur.
