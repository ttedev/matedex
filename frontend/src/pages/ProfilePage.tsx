import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profile';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

function StatChip({ icon, value, label }: { icon: string; value: string | number; label: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg bg-surface-container-low p-4">
      <span className="material-symbols-outlined text-2xl text-primary">{icon}</span>
      <span className="text-headline-md font-black text-primary">{value}</span>
      <span className="text-center text-label-sm leading-tight text-on-surface-variant">{label}</span>
    </div>
  );
}

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
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-4 rounded-lg px-4 py-4 transition-transform duration-200 active:scale-95 ${
        danger ? 'text-error hover:bg-error-container/20' : 'text-on-surface hover:bg-surface-container-high'
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          danger ? 'bg-error-container' : 'bg-surface-container-high'
        }`}
      >
        <span className={`material-symbols-outlined ${danger ? 'text-error' : 'text-primary'}`}>{icon}</span>
      </div>

      <div className="flex-1 text-left">
        <p className="text-body-md font-semibold">{label}</p>
        {sublabel ? <p className="text-label-sm text-on-surface-variant">{sublabel}</p> : null}
      </div>

      {!danger ? <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span> : null}
    </button>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [title, setTitle] = useState(user?.title ?? 'Explorateur estival');

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
    if (window.confirm('Se deconnecter ?')) {
      logout();
      navigate('/login');
    }
  }

  const favTag = stats?.favoriteTags[0]?.name;
  const totalPlans = stats?.totalPlans ?? 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative bg-gradient-to-br from-primary to-secondary px-4 pb-16 pt-12">
        <h1 className="mb-8 text-body-md font-semibold text-on-primary/80">Mon Profil</h1>

        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-on-primary/40 bg-on-primary/20 shadow-xl">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="material-symbols-outlined text-5xl text-on-primary">person</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-on-primary bg-gradient-to-br from-primary via-tertiary to-secondary">
              <span className="material-symbols-outlined text-sm text-on-primary">star</span>
            </div>
          </div>

          {!editMode ? (
            <div className="text-center">
              <h2 className="text-headline-md font-bold text-on-primary">{displayName || user?.displayName}</h2>
              <p className="text-body-md text-on-primary/80">{title || user?.title}</p>
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="mx-auto mt-2 flex items-center gap-1 text-label-sm text-on-primary/70 transition-transform duration-200 hover:text-on-primary active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Modifier le profil
              </button>
            </div>
          ) : (
            <div className="w-full max-w-xs space-y-2">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ton nom"
                className="border-on-primary/30 bg-on-primary/20 text-center text-on-primary placeholder-on-primary/60 focus:border-on-primary focus:ring-on-primary"
              />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ton titre (ex: Explorateur Estival)"
                className="border-on-primary/30 bg-on-primary/20 text-center text-on-primary placeholder-on-primary/60 focus:border-on-primary focus:ring-on-primary"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="tonal"
                  className="flex-1 border border-on-primary/30 bg-on-primary/20 text-on-primary"
                  onClick={() => setEditMode(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-on-primary text-primary hover:bg-on-primary/90"
                  onClick={() => updateProfile.mutate()}
                  isLoading={updateProfile.isPending}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="-mt-8 space-y-6 px-4">
        <div className="space-y-4 rounded-lg bg-surface-container-lowest p-4 shadow-md">
          <h3 className="text-headline-md font-bold text-on-surface">Statistiques estivales</h3>
          <div className="flex gap-3">
            <StatChip icon="list_alt" value={totalPlans} label="Plans crees" />
            <StatChip icon="local_offer" value={favTag ?? '-'} label="Tag favori" />
            <StatChip icon="bar_chart" value={stats?.plansByCategory.length ?? 0} label="Categories" />
          </div>

          {stats && stats.favoriteTags.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-label-lg uppercase tracking-wider text-on-surface-variant">Tags les plus utilises</h4>
              <div className="flex flex-wrap gap-2">
                {stats.favoriteTags.map((tag) => (
                  <span
                    key={tag.name}
                    className="flex items-center gap-1 rounded-full bg-primary-fixed px-3 py-1 text-label-sm text-on-primary-fixed"
                  >
                    #{tag.name}
                    <span className="rounded-full bg-primary/20 px-1.5 text-xs font-bold">{tag.count}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {stats && stats.plansByCategory.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-label-lg uppercase tracking-wider text-on-surface-variant">Repartition</h4>
              <div className="space-y-2">
                {stats.plansByCategory.map((cat) => {
                  const pct = totalPlans > 0 ? Math.round((cat.count / totalPlans) * 100) : 0;
                  const labels: Record<string, string> = {
                    plage: 'Plage',
                    soiree: 'Soiree',
                    festival: 'Festival',
                    autre: 'Autre',
                  };

                  return (
                    <div key={cat.category} className="flex items-center gap-3">
                      <span className="w-20 flex-shrink-0 text-label-sm text-on-surface">{labels[cat.category] ?? cat.category}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-container-highest">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-label-sm text-on-surface-variant">{cat.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-md">
          <MenuItem icon="notifications" label="Notifications" sublabel="Gerer tes alertes" />
          <div className="mx-4 h-px bg-outline-variant/30" />
          <MenuItem icon="security" label="Securite & Confidentialite" sublabel="Mot de passe, donnees" />
          <div className="mx-4 h-px bg-outline-variant/30" />
          <MenuItem icon="palette" label="Apparence" sublabel="Theme, langue" />
          <div className="mx-4 h-px bg-outline-variant/30" />
          <MenuItem icon="help" label="Aide & Support" />
        </div>

        <div className="overflow-hidden rounded-lg bg-surface-container-lowest shadow-md">
          <MenuItem icon="logout" label="Se deconnecter" danger onClick={handleLogout} />
        </div>

        <p className="pb-4 text-center text-label-sm text-on-surface-variant">Matedex v1.0.0</p>
      </div>
    </div>
  );
}
