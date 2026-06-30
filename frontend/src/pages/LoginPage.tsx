import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Au moins 8 caracteres'),
  displayName: z.string().min(2, 'Au moins 2 caracteres').max(50),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const maybeResponse = (error as { response?: { data?: { error?: unknown } } }).response;
    const apiMessage = maybeResponse?.data?.error;
    if (typeof apiMessage === 'string' && apiMessage.length > 0) {
      return apiMessage;
    }
  }

  return fallback;
}

function EmailForm({ onSuccess }: { onSuccess: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [apiError, setApiError] = useState('');
  const { login } = useAuth();

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });
  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  async function handleLogin(data: LoginForm) {
    setApiError('');
    try {
      const result = await authApi.login(data);
      login(result.token, result.user);
      onSuccess();
    } catch (error: unknown) {
      setApiError(getApiErrorMessage(error, 'Erreur de connexion.'));
    }
  }

  async function handleRegister(data: RegisterForm) {
    setApiError('');
    try {
      const result = await authApi.register(data);
      login(result.token, result.user);
      onSuccess();
    } catch (error: unknown) {
      setApiError(getApiErrorMessage(error, "Erreur lors de l'inscription."));
    }
  }

  if (mode === 'login') {
    return (
      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="flex w-full flex-col gap-4">
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
        {apiError ? <p className="text-center text-label-sm text-error">{apiError}</p> : null}
        <Button type="submit" fullWidth isLoading={loginForm.formState.isSubmitting}>
          Se connecter
        </Button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className="text-center text-label-sm text-primary transition-colors duration-200 hover:underline active:scale-95"
        >
          Pas de compte ? Creer un compte →
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="flex w-full flex-col gap-4">
      <Input
        label="Ton prenom ou pseudo"
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
        placeholder="Minimum 8 caracteres"
        {...registerForm.register('password')}
        error={registerForm.formState.errors.password?.message}
      />
      {apiError ? <p className="text-center text-label-sm text-error">{apiError}</p> : null}
      <Button type="submit" fullWidth isLoading={registerForm.formState.isSubmitting}>
        Creer mon compte
      </Button>
      <button
        type="button"
        onClick={() => setMode('login')}
        className="text-center text-label-sm text-primary transition-colors duration-200 hover:underline active:scale-95"
      >
        ← Deja un compte ? Se connecter
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oauthError = searchParams.get('error');

  const oauthUrls = {
    google: import.meta.env.VITE_GOOGLE_OAUTH_URL as string,
    facebook: import.meta.env.VITE_FACEBOOK_OAUTH_URL as string,
    apple: import.meta.env.VITE_APPLE_OAUTH_URL as string,
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-surface px-4 py-10 text-on-surface md:px-20">
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-primary-fixed/50 via-surface to-secondary-container/40" />

      <div className="absolute left-10 top-10 hidden animate-[bounce_4s_ease-in-out_infinite] md:block">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container/90">
          <span className="material-symbols-outlined text-3xl">favorite</span>
        </div>
      </div>
      <div className="absolute bottom-20 right-20 hidden animate-[bounce_5s_ease-in-out_infinite] md:block">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary/95">
          <span className="material-symbols-outlined text-4xl">festival</span>
        </div>
      </div>

      <main className="relative z-10 flex w-full max-w-md flex-col items-center rounded-lg border border-white/80 bg-surface-container-lowest/85 p-6 shadow-2xl backdrop-blur-md md:p-10">
        <div className="relative mb-8 animate-[bounce_4s_ease-in-out_infinite]">
          <div className="flex h-28 w-28 items-center justify-center md:h-36 md:w-36">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-primary shadow-xl">
              <span className="text-2xl font-black tracking-tight text-on-primary">M</span>
            </div>
          </div>
          <div className="absolute -right-2 -top-2 rounded-full bg-tertiary-container p-2 text-on-tertiary rotate-12">
            <span className="material-symbols-outlined text-xl">sunny</span>
          </div>
        </div>

        <header className="mb-8 text-center">
          <h1 className="mb-1 text-display-lg-mobile tracking-tight text-primary">Bienvenue sur Matedex</h1>
          <p className="mx-auto max-w-xs text-body-lg text-on-surface-variant">
            Pret pour un ete riche en rencontres et en couleurs ?
          </p>
        </header>

        {oauthError ? (
          <div className="mb-4 w-full rounded-lg bg-error-container px-4 py-3 text-center text-label-sm text-on-error-container">
            La connexion a echoue. Reessaie.
          </div>
        ) : null}

        {!showEmailForm ? (
          <div className="flex w-full flex-col gap-3">
            <a
              href={oauthUrls.google}
              className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-surface-variant bg-surface-container-lowest px-6 py-4 shadow-sm transition-all duration-200 hover:border-primary/40 hover:scale-[1.02] active:scale-95"
            >
              <GoogleIcon />
              <span className="text-label-lg text-on-surface">Continuer avec Google</span>
            </a>

            <a
              href={oauthUrls.facebook}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-secondary px-6 py-4 text-on-secondary shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              <FacebookIcon />
              <span className="text-label-lg">Continuer avec Facebook</span>
            </a>

            <a
              href={oauthUrls.apple}
              className="flex w-full items-center justify-center gap-3 rounded-full bg-on-surface px-6 py-4 text-surface-container-lowest shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              <AppleIcon />
              <span className="text-label-lg">Continuer avec Apple</span>
            </a>

            <div className="flex items-center gap-2 py-2">
              <div className="h-px flex-1 bg-outline-variant" />
              <span className="px-2 text-label-sm uppercase tracking-widest text-outline">ou</span>
              <div className="h-px flex-1 bg-outline-variant" />
            </div>

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
              type="button"
              onClick={() => setShowEmailForm(false)}
              className="mb-4 flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors duration-200 hover:text-primary active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Retour
            </button>
            <EmailForm onSuccess={() => navigate('/')} />
          </div>
        )}

        <footer className="mt-8 text-center">
          <p className="text-body-md text-on-surface-variant">
            Pas encore de compte ?{' '}
            <button
              type="button"
              onClick={() => setShowEmailForm(true)}
              className="font-bold text-primary transition-colors duration-200 hover:underline active:scale-95"
            >
              Rejoins la communaute !
            </button>
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-6 text-label-sm text-outline">
            <a href="#" className="transition-colors duration-200 hover:text-primary active:scale-95">
              Confidentialite
            </a>
            <a href="#" className="transition-colors duration-200 hover:text-primary active:scale-95">
              Conditions
            </a>
            <a href="#" className="transition-colors duration-200 hover:text-primary active:scale-95">
              Aide
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.05 20.28c-.96.95-2.03 1.91-3.21 1.91-.56 0-.89-.16-1.28-.35-.42-.2-.97-.47-1.63-.47-.64 0-1.18.25-1.58.44-.41.19-.77.38-1.37.38-1.14 0-2.32-1.07-3.37-2.12-2.17-2.18-3.66-6.1-3.66-9 0-3.15 1.51-4.78 3.51-4.78.69 0 1.38.25 1.92.45.45.16.81.29 1.15.29.32 0 .63-.12 1.05-.28.61-.22 1.38-.5 2.21-.5 1.88 0 3.32.99 4.09 2.11-1.63 1-2.01 3.23-.74 4.8 1.06 1.31 2.38 1.63 2.92 1.63-.03.11-.06.22-.09.33-.29 1.05-.91 2.16-1.86 3.21zM14.65 1.14c0 1.86-1.51 3.38-3.38 3.38-.05 0-.09 0-.14-.01.07-2.1 1.8-3.77 3.34-3.77.12 0 .21.01.18.4z" />
    </svg>
  );
}
