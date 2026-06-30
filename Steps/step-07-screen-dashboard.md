# Step 07 — Écran Dashboard (DashboardPage)

## Objectif
Implémenter l'écran d'accueil avec :
- Header avec logo + avatar utilisateur
- 2 cartes de stats (plans ce mois, plans cette année)
- Section "Tags favoris" avec barres de progression
- Section "Derniers plans" (3 dernières cartes condensées)
- Bouton d'action rapide vers `/plans/new`

## Référence Visuelle
Fichier maquette : `Spec/accueil_statistiques_matedex/code.html`

---

## Fichier à Créer

### `frontend/src/pages/DashboardPage.tsx`
```tsx
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { plansApi } from '../api/plans';
import { profileApi } from '../api/profile';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ---- Composant carte stat ----
function StatCard({
  value,
  label,
  subtitle,
  variant = 'primary',
}: {
  value: number;
  label: string;
  subtitle: string;
  variant?: 'primary' | 'secondary';
}) {
  const styles = {
    primary: 'bg-primary-container text-white shadow-[0_10px_25px_-5px_rgba(227,23,84,0.3)]',
    secondary: 'bg-secondary-container text-on-secondary-container shadow-[0_10px_25px_-5px_rgba(0,107,95,0.2)]',
  };

  return (
    <div
      className={`${styles[variant]} p-6 rounded-lg flex flex-col items-center justify-center text-center aspect-square active:scale-95 transition-transform duration-200`}
    >
      <span className="text-display-lg-mobile font-black mb-1">{value}</span>
      <span className="text-label-lg uppercase tracking-widest opacity-90">{label}</span>
      <div className="mt-4 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
        <span className="text-label-sm">{subtitle}</span>
      </div>
    </div>
  );
}

// ---- Composant tag progress ----
function TagProgressBar({ name, count, max }: { name: string; count: number; max: number }) {
  const percent = Math.round((count / max) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-label-lg text-on-surface">#{name}</span>
        <span className="text-label-lg text-on-surface-variant">{percent}%</span>
      </div>
      <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #bb580d 0%, #e31754 100%)',
          }}
        />
      </div>
    </div>
  );
}

// ---- Composant mini-card plan ----
function MiniPlanCard({ plan }: { plan: any }) {
  const navigate = useNavigate();
  const coverPhoto = plan.photos.find((p: any) => !p.isNsfw);
  const BACKEND = import.meta.env.VITE_API_URL;

  return (
    <div
      onClick={() => navigate(`/plans/${plan.id}`)}
      className="bg-surface-container-lowest rounded-lg overflow-hidden cursor-pointer active:scale-95 transition-transform duration-200 flex flex-col"
      style={{ boxShadow: '0 10px 15px -3px rgba(185,0,64,0.1)' }}
    >
      {/* Barre arc-en-ciel */}
      <div
        className="h-1 w-full"
        style={{ background: 'linear-gradient(90deg, #ff3366, #ff9933, #ffff33, #33cc33, #3366ff, #9933ff)' }}
      />
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            {coverPhoto ? (
              <img
                src={`${BACKEND}/uploads/public/${coverPhoto.filePath.replace('public/', '')}`}
                alt={plan.partnerName}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary-container"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center border-2 border-primary-container">
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
              </div>
            )}
            <div>
              <h3 className="text-headline-md text-primary font-bold">{plan.partnerName}</h3>
              <p className="text-label-sm text-outline uppercase tracking-wider">
                {format(new Date(plan.planDate), 'd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>
          {plan.score != null && (
            <div className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-bold text-lg">
              {plan.score}<span className="text-xs">/20</span>
            </div>
          )}
        </div>
        {plan.description && (
          <p className="text-on-surface-variant text-body-md mb-3 line-clamp-2 italic">
            "{plan.description}"
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {plan.tags.slice(0, 3).map(({ tag }: any) => (
            <span
              key={tag.id}
              className="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-full text-label-sm"
            >
              #{tag.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Page principale
// ============================================================

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plansApi.getAll(),
  });

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: profileApi.getStats,
  });

  // Plans ce mois-ci
  const now = new Date();
  const plansThisMonth = plans.filter((p) => {
    const d = new Date(p.planDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const recentPlans = plans.slice(0, 3);
  const maxTagCount = stats?.favoriteTags[0]?.count ?? 1;

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-surface z-50 flex justify-between items-center px-4 py-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-[0_10px_25px_-5px_rgba(185,0,64,0.3)]">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              celebration
            </span>
          </div>
          <h1 className="text-headline-lg text-primary font-black tracking-tight">Matedex</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full border-2 border-primary-container overflow-hidden active:scale-90 transition-transform"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
              </div>
            )}
          </button>
        </div>
      </header>

      <main className="px-4 mt-6 space-y-8 max-w-2xl mx-auto">
        {/* Message de bienvenue */}
        <section className="space-y-1">
          <h2 className="text-headline-md text-on-background">
            Salut, {user?.displayName?.split(' ')[0]} ! 👋
          </h2>
          <p className="text-body-lg text-on-surface-variant">
            Un été riche en couleurs ! Continue tes découvertes.
          </p>
        </section>

        {/* Cartes stats */}
        <section className="grid grid-cols-2 gap-4">
          <StatCard
            value={plansThisMonth}
            label="Plans ce mois"
            subtitle={`sur ${plans.length} total`}
            variant="primary"
          />
          <StatCard
            value={plans.length}
            label="Plans cette année"
            subtitle="En progression 🚀"
            variant="secondary"
          />
        </section>

        {/* Tags favoris */}
        {stats && stats.favoriteTags.length > 0 && (
          <section className="bg-surface-container-low rounded-lg p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-md text-on-surface">Tags Favoris</h3>
              <span className="material-symbols-outlined text-primary">analytics</span>
            </div>
            <div className="space-y-4">
              {stats.favoriteTags.map((tag) => (
                <TagProgressBar key={tag.name} name={tag.name} count={tag.count} max={maxTagCount} />
              ))}
            </div>
          </section>
        )}

        {/* Derniers plans */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-headline-md text-on-surface">Derniers Plans</h3>
            <Link to="/plans" className="text-label-lg text-primary hover:underline">
              Voir tout →
            </Link>
          </div>

          {recentPlans.length === 0 ? (
            <div className="text-center py-12 bg-surface-container rounded-lg">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-3 block">
                add_circle
              </span>
              <p className="text-body-lg text-on-surface-variant mb-4">
                Ton premier plan t'attend !
              </p>
              <button
                onClick={() => navigate('/plans/new')}
                className="bg-primary text-on-primary px-6 py-3 rounded-full text-label-lg font-semibold"
              >
                Ajouter un plan ✨
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentPlans.map((plan) => (
                <MiniPlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FAB Ajout rapide */}
      <button
        onClick={() => navigate('/plans/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-on-primary rounded-full shadow-[0_10px_25px_-5px_rgba(185,0,64,0.4)] flex items-center justify-center z-40 active:scale-90 transition-transform"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>
    </div>
  );
}
```

## Dépendance Supplémentaire

```bash
cd frontend && npm install date-fns
```

---

## Résultat Attendu

- Chargement des plans et statistiques via TanStack Query.
- Affichage du nombre de plans ce mois-ci et total.
- Barre de progression pour chaque tag favori (top 5).
- 3 dernières rencontres affichées avec photo, nom, note, tags.
- État vide avec CTA "Ajouter un plan" si aucun plan.
- FAB en bas à droite pour accès rapide à l'ajout.
