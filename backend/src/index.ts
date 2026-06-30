import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import passport from './config/passport';
import authRoutes from './routes/auth.routes';
import plansRoutes from './routes/plans.routes';
import photosRoutes from './routes/photos.routes';
import profileRoutes from './routes/profile.routes';
import tagsRoutes from './routes/tags.routes';
import { servePublicPhoto } from './controllers/photos.controller';

const app = express();

// Sécurité
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialisation de Passport.js et branchement des routes d'authentification
app.use(passport.initialize());
app.use('/auth', authRoutes);

// Servir les uploads publics (avec fallback legacy sécurisé)
app.get('/uploads/public/:filename', servePublicPhoto);
app.use('/uploads/public', express.static(env.UPLOADS_DIR + '/public'));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/plans', plansRoutes);
app.use('/photos', photosRoutes);
app.use('/profile', profileRoutes);
app.use('/tags', tagsRoutes);

app.listen(env.PORT, () => {
  console.log(`🚀 Backend Matedex démarré sur le port ${env.PORT}`);
});

export default app;