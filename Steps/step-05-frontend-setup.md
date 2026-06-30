# Step 05 — Frontend : Setup, Router, Auth Context, Composants UI de Base

## Objectif
Configurer les couches fondamentales du frontend :
- Client API (axios avec intercepteur JWT)
- Contexte d'authentification (AuthContext)
- Router protégé (routes privées vs publiques)
- Composants UI de base du design system (boutons, inputs, cards, bottom nav)

## Prérequis
- Step 01 complété (frontend Vite + Tailwind configurés)
- Backend fonctionnel sur `http://localhost:3000`

---

## 1. Client API Axios

### `frontend/src/api/client.ts`
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attacher le JWT automatiquement à chaque requête
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('matedex_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gérer les erreurs 401 globalement (token expiré)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('matedex_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### `frontend/src/api/auth.ts`
```typescript
import apiClient from './client';

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: { id: string; email: string; displayName: string; avatarUrl: string | null; title: string };
  token: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  getMe: () =>
    apiClient.get<{ user: AuthResponse['user'] }>('/auth/me').then((r) => r.data),
};
```

### `frontend/src/api/plans.ts`
```typescript
import apiClient from './client';

export interface Plan {
  id: string;
  partnerName: string;
  partnerAge?: number;
  bananaSize?: 'S' | 'M' | 'L' | 'XL';
  latitude?: number;
  longitude?: number;
  locationName?: string;
  description?: string;
  score?: number;
  planDate: string;
  category: 'plage' | 'soiree' | 'festival' | 'autre';
  tags: Array<{ tag: { id: string; name: string } }>;
  photos: Array<{ id: string; filePath: string; isNsfw: boolean; mimeType: string }>;
}

export interface CreatePlanPayload {
  partnerName: string;
  partnerAge?: number;
  bananaSize?: 'S' | 'M' | 'L' | 'XL';
  latitude?: number;
  longitude?: number;
  locationName?: string;
  description?: string;
  score?: number;
  planDate?: string;
  category?: Plan['category'];
  tagIds?: string[];
}

export const plansApi = {
  getAll: (category?: string) =>
    apiClient.get<{ plans: Plan[] }>('/plans', { params: category ? { category } : {} }).then((r) => r.data.plans),

  getById: (id: string) =>
    apiClient.get<{ plan: Plan }>(`/plans/${id}`).then((r) => r.data.plan),

  create: (data: CreatePlanPayload) =>
    apiClient.post<{ plan: Plan }>('/plans', data).then((r) => r.data.plan),

  update: (id: string, data: Partial<CreatePlanPayload>) =>
    apiClient.patch<{ plan: Plan }>(`/plans/${id}`, data).then((r) => r.data.plan),

  delete: (id: string) =>
    apiClient.delete(`/plans/${id}`),
};
```

### `frontend/src/api/photos.ts`
```typescript
import apiClient from './client';

export const photosApi = {
  upload: (planId: string, file: File, isNsfw: boolean) => {
    const form = new FormData();
    form.append('photo', file);
    form.append('planId', planId);
    form.append('isNsfw', String(isNsfw));
    return apiClient.post('/photos/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // URL pour afficher une photo privée (le header Auth est géré par apiClient)
  getPrivateUrl: (filename: string) =>
    `${import.meta.env.VITE_API_URL}/photos/private/${filename}`,

  delete: (id: string) => apiClient.delete(`/photos/${id}`),
};
```

### `frontend/src/api/profile.ts`
```typescript
import apiClient from './client';

export interface ProfileStats {
  totalPlans: number;
  favoriteTags: Array<{ name: string; count: number }>;
  plansByCategory: Array<{ category: string; count: number }>;
}

export const profileApi = {
  get: () =>
    apiClient.get('/profile').then((r) => r.data.user),

  update: (data: { displayName?: string; title?: string }) =>
    apiClient.patch('/profile', data).then((r) => r.data.user),

  getStats: () =>
    apiClient.get<{ stats: ProfileStats }>('/profile/stats').then((r) => r.data.stats),
};

export const tagsApi = {
  getAll: () =>
    apiClient.get<{ tags: Array<{ id: string; name: string; isSystem: boolean }> }>('/tags').then((r) => r.data.tags),

  create: (name: string) =>
    apiClient.post<{ tag: { id: string; name: string } }>('/tags', { name }).then((r) => r.data.tag),
};
```

---

## 2. Contexte d'Authentification

### `frontend/src/contexts/AuthContext.tsx`
```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi } from '../api/auth';

interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  title: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('matedex_token');
    if (storedToken) {
      setToken(storedToken);
      authApi
        .getMe()
        .then((data) => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('matedex_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  function login(newToken: string, newUser: User) {
    localStorage.setItem('matedex_token', newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem('matedex_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
```

---

## 3. Router avec Routes Protégées

### `frontend/src/router.tsx`
```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import AddPlanPage from './pages/AddPlanPage';
import MyPlansPage from './pages/MyPlansPage';
import PlanDetailPage from './pages/PlanDetailPage';
import ProfilePage from './pages/ProfilePage';
import AppLayout from './components/AppLayout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center text-primary text-headline-md">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/oauth-callback" element={<OAuthCallbackPage />} />

      {/* Routes privées avec layout (bottom nav) */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="plans" element={<MyPlansPage />} />
        <Route path="plans/:id" element={<PlanDetailPage />} />
        <Route path="plans/new" element={<AddPlanPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

### `frontend/src/pages/OAuthCallbackPage.tsx`
```tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      navigate('/login?error=oauth_failed');
      return;
    }

    // Stocker le token puis récupérer le profil
    localStorage.setItem('matedex_token', token);
    authApi
      .getMe()
      .then((data) => {
        login(token, data.user);
        navigate('/');
      })
      .catch(() => navigate('/login?error=oauth_failed'));
  }, []);

  return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <p className="text-body-lg text-on-surface">Connexion en cours...</p>
    </div>
  );
}
```

---

## 4. Composants UI de Base (Design System)

### `frontend/src/components/AppLayout.tsx`
```tsx
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
```

### `frontend/src/components/BottomNav.tsx`
```tsx
import { NavLink } from 'react-router-dom';

const TABS = [
  { to: '/', label: 'Accueil', icon: 'home' },
  { to: '/plans', label: 'Mes Plans', icon: 'list_alt' },
  { to: '/plans/new', label: '+', icon: 'add_circle', isAction: true },
  { to: '/profile', label: 'Profil', icon: 'person' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-container-high border-t border-outline-variant flex items-center justify-around h-16 z-50 px-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
              tab.isAction
                ? 'bg-primary text-on-primary rounded-full w-12 h-12 flex items-center justify-center shadow-lg'
                : isActive
                ? 'text-primary'
                : 'text-on-surface-variant'
            }`
          }
        >
          <span className="material-symbols-outlined text-2xl">{tab.icon}</span>
          {!tab.isAction && <span className="text-label-sm">{tab.label}</span>}
        </NavLink>
      ))}
    </nav>
  );
}
```

### `frontend/src/components/ui/Button.tsx`
```tsx
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'filled' | 'outlined' | 'text' | 'tonal';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
}

const variants = {
  filled: 'bg-primary text-on-primary hover:bg-primary/90 active:bg-primary/80',
  outlined: 'border-2 border-primary text-primary hover:bg-primary/10',
  text: 'text-primary hover:bg-primary/10',
  tonal: 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest',
};

const sizes = {
  sm: 'px-4 py-2 text-label-lg',
  md: 'px-6 py-3 text-body-md font-semibold',
  lg: 'px-8 py-4 text-body-lg font-semibold',
};

export default function Button({
  variant = 'filled',
  size = 'md',
  children,
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded-full font-montserrat font-semibold
        transition-all duration-150 ease-in-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="animate-spin material-symbols-outlined text-sm">progress_activity</span>
      ) : null}
      {children}
    </button>
  );
}
```

### `frontend/src/components/ui/Input.tsx`
```tsx
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-label-lg text-on-surface-variant">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`
          w-full px-4 py-3 rounded-lg
          bg-surface-container border border-outline-variant
          text-body-md text-on-surface placeholder-on-surface-variant/60
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          transition-colors
          ${error ? 'border-error focus:ring-error' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-label-sm text-error">{error}</span>}
    </div>
  )
);

Input.displayName = 'Input';
export default Input;
```

### `frontend/src/components/ui/TagPicker.tsx`
```tsx
import { useState } from 'react';
import { tagsApi } from '../../api/profile';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface TagPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export default function TagPicker({ selectedIds, onChange }: TagPickerProps) {
  const [newTag, setNewTag] = useState('');
  const queryClient = useQueryClient();

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: tagsApi.getAll,
  });

  const createTag = useMutation({
    mutationFn: (name: string) => tagsApi.create(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  async function handleAddTag() {
    const name = newTag.trim();
    if (!name) return;
    const tag = await createTag.mutateAsync(name);
    onChange([...selectedIds, tag.id]);
    setNewTag('');
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            className={`px-3 py-1 rounded-full text-label-lg transition-colors ${
              selectedIds.includes(tag.id)
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant border border-outline-variant'
            }`}
          >
            {tag.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
          placeholder="Nouveau tag..."
          className="flex-1 px-3 py-2 rounded-lg bg-surface-container border border-outline-variant text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={handleAddTag}
          className="px-3 py-2 bg-surface-container-high rounded-lg text-primary text-label-lg border border-outline-variant"
        >
          + Ajouter
        </button>
      </div>
    </div>
  );
}
```

### `frontend/src/components/ui/BananaSlider.tsx`
```tsx
interface BananaSliderProps {
  value?: 'S' | 'M' | 'L' | 'XL';
  onChange: (value: 'S' | 'M' | 'L' | 'XL') => void;
}

const SIZES = ['S', 'M', 'L', 'XL'] as const;

// Tailles de banane visuelles proportionnelles
const BANANA_HEIGHTS: Record<string, string> = {
  S: 'h-8',
  M: 'h-12',
  L: 'h-16',
  XL: 'h-20',
};

export default function BananaSlider({ value, onChange }: BananaSliderProps) {
  return (
    <div className="flex items-end justify-around gap-4 bg-surface-container p-4 rounded-lg">
      {SIZES.map((size) => (
        <button
          key={size}
          type="button"
          onClick={() => onChange(size)}
          className="flex flex-col items-center gap-2 transition-transform"
          style={{ transform: value === size ? 'scale(1.15)' : 'scale(1)' }}
        >
          {/* Banane SVG simplifiée */}
          <div
            className={`${BANANA_HEIGHTS[size]} w-6 rounded-full flex items-center justify-center text-2xl`}
            style={{ filter: value === size ? 'none' : 'grayscale(60%) opacity(0.6)' }}
          >
            🍌
          </div>
          <span
            className={`text-label-lg font-bold transition-colors ${
              value === size ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            {size}
          </span>
        </button>
      ))}
    </div>
  );
}
```

---

## 5. Ajout des Material Symbols dans `index.html`

Dans `frontend/index.html`, ajouter dans `<head>` :
```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
```

---

## Résultat Attendu

- `AuthContext` fonctionne : connexion/déconnexion persistée via `localStorage`.
- Le router redirige vers `/login` si non authentifié.
- La `BottomNav` s'affiche sur toutes les pages privées.
- Les composants `Button`, `Input`, `TagPicker`, `BananaSlider` sont prêts à l'emploi.
- `apiClient` attache automatiquement le JWT et gère les 401.
