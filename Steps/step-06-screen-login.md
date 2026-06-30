# Step 06 — Écran Connexion (LoginPage)

## Objectif
Implémenter l'écran de connexion avec :
- Boutons OAuth (Google, Facebook, Apple)
- Formulaire email/mot de passe (toggle)
- Animation "bounce slow" sur les éléments décoratifs
- Design "Summer Joy & Inclusivity"

## Référence Visuelle
Fichier maquette : `Spec/connexion_matedex/code.html`

Éléments clés :
- Fond `#fff8f7` avec motif décoratif estival en fond (opacité 15%)
- Card centrale `max-w-md` avec `bg-white/80 backdrop-blur-md`
- Logo Matedex animé (bounce lent)
- 3 boutons sociaux + séparateur "ou" + bouton email/password
- Pied de page avec liens légaux
- Éléments flottants décoratifs (cœur, festival) sur desktop

---

## Fichier à Créer

### `frontend/src/pages/LoginPage.tsx`
```tsx
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

// ============================================================
// Validation
// ============================================================

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
  displayName: z.string().min(2, 'Au moins 2 caractères').max(50),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

// ============================================================
// Sous-composant : Formulaire Email
// ============================================================

function EmailForm({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [apiError, setApiError] = useState('');
  const { login } = useAuth();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  async function handleLogin(data: LoginForm) {
    setApiError('');
    try {
      const result = await authApi.login(data);
      login(result.token, result.user);
      onSuccess();
    } catch (err: any) {
      setApiError(err.response?.data?.error ?? 'Erreur de connexion.');
    }
  }

  async function handleRegister(data: RegisterForm) {
    setApiError('');
    try {
      const result = await authApi.register(data);
      login(result.token, result.user);
      onSuccess();
    } catch (err: any) {
      setApiError(err.response?.data?.error ?? "Erreur lors de l'inscription.");
    }
  }

  if (mode === 'login') {
    return (
      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="flex flex-col gap-4 w-full">
        <Input
          label="Adresse e-mail"
          type="email"
          placeholder="toi@exemple.com"
          {...loginForm.register('email')}
          error={loginForm.formState.errors.email?.message}
        />
        <Input
          label="Mot de passe"
          type="password"
          placeholder="••••••••"
          {...loginForm.register('password')}
          error={loginForm.formState.errors.password?.message}
        />
        {apiError && <p className="text-label-sm text-error text-center">{apiError}</p>}
        <Button
          type="submit"
          fullWidth
          isLoading={loginForm.formState.isSubmitting}
        >
          Se connecter
        </Button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className="text-label-sm text-primary text-center hover:underline"
        >
          Pas de compte ? Créer un compte →
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="flex flex-col gap-4 w-full">
      <Input
        label="Ton prénom ou pseudo"
        placeholder="Ex: Alex, Sunny..."
        {...registerForm.register('displayName')}
        error={registerForm.formState.errors.displayName?.message}
      />
      <Input
        label="Adresse e-mail"
        type="email"
        placeholder="toi@exemple.com"
        {...registerForm.register('email')}
        error={registerForm.formState.errors.email?.message}
      />
      <Input
        label="Mot de passe"
        type="password"
        placeholder="Minimum 8 caractères"
        {...registerForm.register('password')}
        error={registerForm.formState.errors.password?.message}
      />
      {apiError && <p className="text-label-sm text-error text-center">{apiError}</p>}
      <Button
        type="submit"
        fullWidth
        isLoading={registerForm.formState.isSubmitting}
      >
        Créer mon compte 🌈
      </Button>
      <button
        type="button"
        onClick={() => setMode('login')}
        className="text-label-sm text-primary text-center hover:underline"
      >
        ← Déjà un compte ? Se connecter
      </button>
    </form>
  );
}

// ============================================================
// Page principale
// ============================================================

export default function LoginPage() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oauthError = searchParams.get('error');

  const OAUTH_URLS = {
    google: import.meta.env.VITE_GOOGLE_OAUTH_URL as string,
    facebook: import.meta.env.VITE_FACEBOOK_OAUTH_URL as string,
    apple: import.meta.env.VITE_APPLE_OAUTH_URL as string,
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center relative px-4 md:px-20 py-10 overflow-hidden">

      {/* Fond décoratif estival */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, #ffd9dc 0%, transparent 60%), radial-gradient(ellipse at bottom, #76f4e0 0%, transparent 60%)',
          opacity: 0.25,
        }}
      />

      {/* Éléments flottants desktop */}
      <div className="hidden md:block absolute top-10 left-10 animate-[bounce_4s_ease-in-out_infinite]">
        <div className="w-16 h-16 bg-secondary-container rounded-full flex items-center justify-center text-on-secondary-container opacity-60">
          <span className="material-symbols-outlined text-3xl">favorite</span>
        </div>
      </div>
      <div className="hidden md:block absolute bottom-20 right-20 animate-[bounce_5s_ease-in-out_infinite]">
        <div className="w-20 h-20 bg-tertiary-fixed rounded-full flex items-center justify-center text-on-tertiary-fixed opacity-60">
          <span className="material-symbols-outlined text-4xl">festival</span>
        </div>
      </div>

      {/* Card principale */}
      <main className="w-full max-w-md bg-white/85 backdrop-blur-md rounded-lg p-6 md:p-10 shadow-2xl relative z-10 flex flex-col items-center border border-white">

        {/* Logo */}
        <div className="relative mb-8 animate-[bounce_4s_ease-in-out_infinite]">
          <div className="w-28 h-28 md:w-36 md:h-36 flex items-center justify-center">
            {/* Logo textuel Matedex en attendant une vraie image */}
            <div className="w-full h-full rounded-full bg-primary flex items-center justify-center shadow-xl">
              <span className="text-on-primary font-black text-2xl tracking-tight">M</span>
            </div>
          </div>
          <div className="absolute -top-2 -right-2 bg-tertiary-fixed text-on-tertiary-fixed rounded-full p-2 rotate-12">
            <span className="material-symbols-outlined text-xl">sunny</span>
          </div>
        </div>

        {/* Titre */}
        <header className="text-center mb-8">
          <h1 className="text-display-lg-mobile text-primary tracking-tight mb-1">
            Bienvenue sur Matedex
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-xs mx-auto">
            Prêt pour un été riche en rencontres et en couleurs ?
          </p>
        </header>

        {/* Erreur OAuth */}
        {oauthError && (
          <div className="w-full mb-4 px-4 py-3 bg-error-container text-on-error-container rounded-lg text-label-sm text-center">
            La connexion a échoué. Réessaie.
          </div>
        )}

        {/* Boutons sociaux ou formulaire email */}
        {!showEmailForm ? (
          <div className="w-full flex flex-col gap-3">
            {/* Google */}
            <a
              href={OAUTH_URLS.google}
              className="w-full py-4 px-6 rounded-full bg-white border-2 border-surface-variant flex items-center justify-center gap-3 transition-all hover:border-primary/40 hover:scale-[1.02] active:scale-[0.97] shadow-sm"
            >
              <GoogleIcon />
              <span className="text-label-lg text-on-surface">Continuer avec Google</span>
            </a>

            {/* Facebook */}
            <a
              href={OAUTH_URLS.facebook}
              className="w-full py-4 px-6 rounded-full bg-[#1877F2] text-white flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.97] shadow-md"
            >
              <FacebookIcon />
              <span className="text-label-lg">Continuer avec Facebook</span>
            </a>

            {/* Apple */}
            <a
              href={OAUTH_URLS.apple}
              className="w-full py-4 px-6 rounded-full bg-on-surface text-white flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.97] shadow-md"
            >
              <AppleIcon />
              <span className="text-label-lg">Continuer avec Apple</span>
            </a>

            {/* Séparateur */}
            <div className="flex items-center gap-2 py-2">
              <div className="h-px flex-1 bg-outline-variant" />
              <span className="text-label-sm text-outline uppercase tracking-widest px-2">ou</span>
              <div className="h-px flex-1 bg-outline-variant" />
            </div>

            {/* Bouton email */}
            <Button
              onClick={() => setShowEmailForm(true)}
              fullWidth
              size="lg"
              className="shadow-[0_10px_25px_-5px_rgba(185,0,64,0.3)]"
            >
              Se connecter par e-mail
            </Button>
          </div>
        ) : (
          <div className="w-full">
            <button
              onClick={() => setShowEmailForm(false)}
              className="mb-4 text-label-sm text-on-surface-variant hover:text-primary flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Retour
            </button>
            <EmailForm onSuccess={() => navigate('/')} />
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-body-md text-on-surface-variant">
            Pas encore de compte ?{' '}
            <button
              onClick={() => setShowEmailForm(true)}
              className="text-primary font-bold hover:underline"
            >
              Rejoins la communauté !
            </button>
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-6 text-label-sm text-outline">
            <a href="#" className="hover:text-primary transition-colors">Confidentialité</a>
            <a href="#" className="hover:text-primary transition-colors">Conditions</a>
            <a href="#" className="hover:text-primary transition-colors">Aide</a>
          </div>
        </footer>
      </main>
    </div>
  );
}

// ============================================================
// Icônes SVG
// ============================================================

function GoogleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.05 20.28c-.96.95-2.03 1.91-3.21 1.91-.56 0-.89-.16-1.28-.35-.42-.2-.97-.47-1.63-.47-.64 0-1.18.25-1.58.44-.41.19-.77.38-1.37.38-1.14 0-2.32-1.07-3.37-2.12-2.17-2.18-3.66-6.1-3.66-9 0-3.15 1.51-4.78 3.51-4.78.69 0 1.38.25 1.92.45.45.16.81.29 1.15.29.32 0 .63-.12 1.05-.28.61-.22 1.38-.5 2.21-.5 1.88 0 3.32.99 4.09 2.11-1.63 1-2.01 3.23-.74 4.8 1.06 1.31 2.38 1.63 2.92 1.63-.03.11-.06.22-.09.33-.29 1.05-.91 2.16-1.86 3.21zM14.65 1.14c0 1.86-1.51 3.38-3.38 3.38-.05 0-.09 0-.14-.01.07-2.1 1.8-3.77 3.34-3.77.12 0 .21.01.18.4z" />
    </svg>
  );
}
```

---

## Résultat Attendu

- Page `/login` affiche les 3 boutons OAuth + option email.
- Clic sur un bouton OAuth redirige vers le backend (`/auth/google`, etc.).
- Formulaire email/password fonctionne (inscription + connexion).
- Erreurs de validation affichées en temps réel.
- Après connexion réussie, redirection vers `/`.
- Design fidèle à la maquette (couleurs, typographie, animations).
