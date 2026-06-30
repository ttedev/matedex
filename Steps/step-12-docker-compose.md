# Step 12 — Docker Compose + Nginx (Déploiement)

## Objectif
Configurer l'infrastructure complète pour lancer toute l'application avec une seule commande :
- PostgreSQL (base de données)
- Backend Express (API)
- Frontend React (build statique servi par Nginx)
- Nginx Reverse Proxy (point d'entrée unique sur le port 80)

---

## 1. `docker-compose.yml` (racine du projet)

```yaml
version: '3.9'

services:

  # ============================================================
  # Base de données PostgreSQL
  # ============================================================
  db:
    image: postgres:16-alpine
    container_name: matedex-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: matedex
      POSTGRES_PASSWORD: matedex_secret
      POSTGRES_DB: matedex_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"        # Exposé uniquement pour debug local
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U matedex -d matedex_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ============================================================
  # Backend Express / Node.js
  # ============================================================
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: matedex-backend
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://matedex:matedex_secret@db:5432/matedex_db
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 7d
      PORT: 3000
      FRONTEND_URL: ${FRONTEND_URL:-http://localhost}
      UPLOADS_DIR: /app/uploads
      MAX_FILE_SIZE_MB: 10
      # OAuth (optionnel — laisser vide si non configuré)
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:-}
      FACEBOOK_APP_ID: ${FACEBOOK_APP_ID:-}
      FACEBOOK_APP_SECRET: ${FACEBOOK_APP_SECRET:-}
      APPLE_CLIENT_ID: ${APPLE_CLIENT_ID:-}
      APPLE_TEAM_ID: ${APPLE_TEAM_ID:-}
      APPLE_KEY_ID: ${APPLE_KEY_ID:-}
      APPLE_PRIVATE_KEY: ${APPLE_PRIVATE_KEY:-}
    volumes:
      - uploads_data:/app/uploads
    ports:
      - "3000:3000"        # Exposé uniquement pour debug local
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3

  # ============================================================
  # Frontend React (build statique via Nginx)
  # ============================================================
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: /api          # Via proxy Nginx — pas d'URL absolue
        VITE_GOOGLE_OAUTH_URL: /api/auth/google
        VITE_FACEBOOK_OAUTH_URL: /api/auth/facebook
        VITE_APPLE_OAUTH_URL: /api/auth/apple
    container_name: matedex-frontend
    restart: unless-stopped
    depends_on:
      - backend

  # ============================================================
  # Nginx Reverse Proxy
  # ============================================================
  nginx:
    image: nginx:alpine
    container_name: matedex-nginx
    restart: unless-stopped
    depends_on:
      - backend
      - frontend
    ports:
      - "80:80"
      - "443:443"        # Pour HTTPS en production (nécessite certificat)
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - uploads_data:/app/uploads:ro    # Accès aux uploads publics
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
    driver: local
  uploads_data:
    driver: local
```

---

## 2. `nginx.conf` (racine du projet)

```nginx
# nginx.conf
upstream backend {
    server backend:3000;
}

upstream frontend {
    server frontend:80;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 15M;  # Pour les uploads photos

    # ---- API → Backend Express ----
    location /api/ {
        proxy_pass http://backend/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # ---- Uploads publics servis directement par Nginx ----
    location /uploads/public/ {
        alias /app/uploads/public/;
        expires 7d;
        add_header Cache-Control "public, immutable";
        # Sécurité : interdire l'exécution de scripts
        location ~* \.(php|cgi|pl|py|sh)$ {
            deny all;
        }
    }

    # ---- Frontend React (SPA) ----
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        # SPA fallback : toujours servir index.html
        proxy_intercept_errors on;
        error_page 404 = /index.html;
    }

    # ---- Health check Nginx ----
    location = /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
}
```

---

## 3. Modification du `frontend/Dockerfile` pour passer les build args

Remplacer le Dockerfile frontend de Step 01 par :

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Les variables VITE_ sont injectées au build time
ARG VITE_API_URL=/api
ARG VITE_GOOGLE_OAUTH_URL=/api/auth/google
ARG VITE_FACEBOOK_OAUTH_URL=/api/auth/facebook
ARG VITE_APPLE_OAUTH_URL=/api/auth/apple
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_OAUTH_URL=$VITE_GOOGLE_OAUTH_URL
ENV VITE_FACEBOOK_OAUTH_URL=$VITE_FACEBOOK_OAUTH_URL
ENV VITE_APPLE_OAUTH_URL=$VITE_APPLE_OAUTH_URL
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 4. Fichier `.env` à créer à la racine du projet

```env
# Secrets (à personnaliser)
JWT_SECRET=change_me_random_256_bit_string

# URLs
FRONTEND_URL=http://localhost

# OAuth (optionnel pour démarrer)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
```

---

## 5. Script de démarrage (`Makefile` ou commandes)

### Option A — Makefile (racine du projet)
```makefile
.PHONY: up down logs reset

# Démarrer toute l'application
up:
	docker compose up -d --build

# Arrêter
down:
	docker compose down

# Voir les logs
logs:
	docker compose logs -f

# Reset complet (supprime les volumes !)
reset:
	docker compose down -v
	docker compose up -d --build

# Seed la base de données
seed:
	docker compose exec backend npx prisma db seed

# Ouvrir Prisma Studio
studio:
	docker compose exec backend npx prisma studio --port 5555
```

### Option B — Commandes directes
```bash
# 1. Premier démarrage
docker compose up -d --build

# 2. Vérifier que tout tourne
docker compose ps

# 3. Lancer le seed (tags système)
docker compose exec backend npx prisma db seed

# 4. Accéder à l'application
open http://localhost

# 5. Voir les logs en temps réel
docker compose logs -f backend

# 6. Arrêter
docker compose down
```

---

## 6. Développement Local (sans Docker)

Pour développer sans Docker :

```bash
# Terminal 1 : PostgreSQL via Docker seulement
docker compose up db -d

# Terminal 2 : Backend
cd backend
cp ../.env.example .env   # Adapter DATABASE_URL avec localhost:5432
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev

# Terminal 3 : Frontend
cd frontend
cp ../.env.example .env   # VITE_API_URL=http://localhost:3000
npm install
npm run dev
```

---

## 7. Vérifications Post-Déploiement

```bash
# Health checks
curl http://localhost/health                    # → OK
curl http://localhost/api/health               # → {"status":"ok",...}

# Base de données accessible
docker compose exec db psql -U matedex -d matedex_db -c "\dt"
# → Doit lister les tables : users, plans, tags, photos, etc.

# Logs sans erreur
docker compose logs backend --tail=50
docker compose logs nginx --tail=20
```

---

## Résumé de l'Architecture Finale

```
Internet
    ↓
 Nginx :80
    ├── /api/*         → Backend Express :3000
    ├── /uploads/public/* → Fichiers statiques (volume Docker)
    └── /*             → Frontend React (SPA)

Backend :3000
    └── PostgreSQL :5432 (réseau Docker interne)

Volume : uploads_data (partagé backend ↔ nginx)
Volume : postgres_data (persistance BDD)
```

---

## Résultat Attendu

- `docker compose up -d --build` démarre toute l'application en une commande.
- L'application est accessible sur `http://localhost`.
- Les photos uploadées sont persistées entre les redémarrages.
- La BDD est persistée dans un volume nommé.
- Les migrations Prisma sont appliquées automatiquement au démarrage du backend.
