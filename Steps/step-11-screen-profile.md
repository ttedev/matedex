# Step 11 — Écran Mon Profil (ProfilePage)

## Objectif
Implémenter l'écran de profil utilisateur avec :
- Avatar + titre utilisateur (ex: "Explorateur Estival")
- Statistiques estivales (total plans, tags favoris, répartition catégories)
- Menu de gestion : Préférences, Sécurité, Notifications, Déconnexion

## Référence Visuelle
Fichier maquette : `Spec/mon_profil_matedex/code.html`

---

## Fichier à Créer

### `frontend/src/pages/ProfilePage.tsx`
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { profileApi } from '../api/profile';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

// ---- Composant carte statistique ----
function StatChip({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 bg-surface-container-low p-4 rounded-lg flex-1 min-w-0">
      <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
      <span className="text-headline-md text-primary font-black">{value}</span>
      <span className="text-label-sm text-on-surface-variant text-center leading-tight">{label}</span>
    </div>
  );
}

// ---- Composant ligne de menu ----
function MenuItem({
  icon,
  label,
  sublabel,
  danger,
  onClick,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 py-4 px-4 rounded-lg transition-colors active:scale-[0.98] ${
        danger
          ? 'text-error hover:bg-error-container/20'
          : 'text-on-surface hover:bg-surface-container-high'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        danger ? 'bg-error-container' : 'bg-surface-container-high'
      }`}>
        <span className={`material-symbols-outlined ${danger ? 'text-error' : 'text-primary'}`}>
          {icon}
        </span>
      </div>
      <div className="flex-1 text-left">
        <p className="text-body-md font-semibold">{label}</p>
        {sublabel && <p className="text-label-sm text-on-surface-variant">{sublabel}</p>}
      </div>
      {!danger && (
        <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
      )}
    </button>
  );
}

// ============================================================
// Page principale
// ============================================================

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [title, setTitle] = useState(user?.title ?? 'Explorateur Estival');

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: profileApi.getStats,
  });

  const updateProfile = useMutation({
    mutationFn: () => profileApi.update({ displayName, title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditMode(false);
    },
  });

  function handleLogout() {
    if (confirm('Se déconnecter ?')) {
      logout();
      navigate('/login');
    }
  }

  const favTag = stats?.favoriteTags[0]?.name;
  const totalPlans = stats?.totalPlans ?? 0;

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header dégradé */}
      <div
        className="relative px-4 pt-12 pb-16"
        style={{ background: 'linear-gradient(135deg, #b90040 0%, #006b5f 100%)' }}
      >
        <h1 className="text-on-primary text-body-md font-semibold mb-8 opacity-80">Mon Profil</h1>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-white/40 overflow-hidden bg-white/20 flex items-center justify-center shadow-xl">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-5xl text-white">person</span>
              )}
            </div>
            {/* Badge Pride arc-en-ciel */}
            <div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ff3366, #ff9933, #ffff33, #33cc33, #3366ff, #9933ff)' }}
            >
              <span className="material-symbols-outlined text-white text-sm">star</span>
            </div>
          </div>

          {!editMode ? (
            <div className="text-center">
              <h2 className="text-headline-md text-white font-bold">{user?.displayName}</h2>
              <p className="text-on-primary/80 text-body-md">{user?.title}</p>
              <button
                onClick={() => setEditMode(true)}
                className="mt-2 text-white/70 text-label-sm flex items-center gap-1 mx-auto hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Modifier le profil
              </button>
            </div>
          ) : (
            <div className="w-full max-w-xs space-y-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ton nom"
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 text-body-md focus:outline-none focus:ring-2 focus:ring-white/50 text-center"
              />
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ton titre (ex: Explorateur Estival)"
                className="w-full px-4 py-2 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 text-body-md focus:outline-none focus:ring-2 focus:ring-white/50 text-center"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="flex-1 py-2 rounded-full bg-white/20 text-white text-label-lg border border-white/30"
                >
                  Annuler
                </button>
                <button
                  onClick={() => updateProfile.mutate()}
                  disabled={updateProfile.isPending}
                  className="flex-1 py-2 rounded-full bg-white text-primary text-label-lg font-bold"
                >
                  {updateProfile.isPending ? '...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 -mt-8 space-y-6">
        {/* Carte Statistiques */}
        <div className="bg-surface-container-lowest rounded-lg p-4 shadow-md space-y-4">
          <h3 className="text-headline-md text-on-surface font-bold">
            Statistiques Estivales ☀️
          </h3>
          <div className="flex gap-3">
            <StatChip
              icon="list_alt"
              value={totalPlans}
              label="Plans créés"
            />
            <StatChip
              icon="local_offer"
              value={favTag ?? '—'}
              label="Tag favori"
            />
            <StatChip
              icon="bar_chart"
              value={stats?.plansByCategory.length ?? 0}
              label="Catégories"
            />
          </div>

          {/* Top tags */}
          {stats && stats.favoriteTags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Tags les plus utilisés</h4>
              <div className="flex flex-wrap gap-2">
                {stats.favoriteTags.map((tag) => (
                  <span
                    key={tag.name}
                    className="bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-label-sm flex items-center gap-1"
                  >
                    #{tag.name}
                    <span className="bg-primary/20 px-1.5 rounded-full text-xs font-bold">
                      {tag.count}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Répartition catégories */}
          {stats && stats.plansByCategory.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Répartition</h4>
              <div className="space-y-2">
                {stats.plansByCategory.map((cat) => {
                  const pct = Math.round((cat.count / totalPlans) * 100);
                  const labels: Record<string, string> = {
                    plage: '🏖️ Plage',
                    soiree: '🎉 Soirée',
                    festival: '🎪 Festival',
                    autre: '✨ Autre',
                  };
                  return (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span className="text-label-sm text-on-surface w-20 flex-shrink-0">
                        {labels[cat.category] ?? cat.category}
                      </span>
                      <div className="flex-1 h-3 bg-surface-container-highest rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-label-sm text-on-surface-variant w-8 text-right">
                        {cat.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Menu */}
        <div className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-md">
          <MenuItem
            icon="notifications"
            label="Notifications"
            sublabel="Gérer tes alertes"
          />
          <div className="h-px bg-outline-variant/30 mx-4" />
          <MenuItem
            icon="security"
            label="Sécurité & Confidentialité"
            sublabel="Mot de passe, données"
          />
          <div className="h-px bg-outline-variant/30 mx-4" />
          <MenuItem
            icon="palette"
            label="Apparence"
            sublabel="Thème, langue"
          />
          <div className="h-px bg-outline-variant/30 mx-4" />
          <MenuItem
            icon="help"
            label="Aide & Support"
          />
        </div>

        {/* Déconnexion */}
        <div className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-md">
          <MenuItem
            icon="logout"
            label="Se déconnecter"
            danger
            onClick={handleLogout}
          />
        </div>

        {/* Version */}
        <p className="text-center text-label-sm text-on-surface-variant pb-4">
          Matedex v1.0.0 · Fait avec 🌈 et ❤️
        </p>
      </div>
    </div>
  );
}
```

---

## Résultat Attendu

- Header dégradé avec avatar, nom et titre modifiables inline.
- Carte statistiques : total plans, tag favori, nombre de catégories.
- Barres de progression par catégorie.
- Tags favoris affichés avec leur nombre d'utilisations.
- Menu avec icônes (notifications, sécurité, apparence, aide).
- Bouton déconnexion avec confirmation → retour vers `/login`.
- Profil modifiable directement depuis cet écran.
