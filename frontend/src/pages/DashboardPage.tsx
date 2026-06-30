import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { plansApi, type Plan } from '../api/plans';
import { photosApi } from '../api/photos';
import { profileApi } from '../api/profile';
import { useAuth } from '../contexts/AuthContext';

interface FavoriteTag {
  name: string;
  count: number;
}

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
  const styles: Record<'primary' | 'secondary', string> = {
    primary: 'bg-primary-container text-on-primary-container shadow-lg',
    secondary: 'bg-secondary-container text-on-secondary-container shadow-lg',
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

function TagProgressBar({ name, count, max }: { name: string; count: number; max: number }) {
  const percent = Math.max(0, Math.round((count / max) * 100));

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-label-lg text-on-surface">#{name}</span>
        <span className="text-label-lg text-on-surface-variant">{percent}%</span>
      </div>
      <div className="h-4 w-full bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-tertiary-container to-primary-container"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function MiniPlanCard({ plan }: { plan: Plan }) {
  const navigate = useNavigate();
  const coverPhoto = plan.photos.find((photo) => !photo.isNsfw);

  return (
    <button
      type="button"
      onClick={() => navigate(`/plans/${plan.id}`)}
      className="bg-surface-container-lowest rounded-lg overflow-hidden active:scale-95 transition-transform duration-200 flex flex-col text-left w-full shadow-md"
    >
      <div className="h-1 w-full bg-gradient-to-r from-primary via-tertiary to-secondary" />

      <div className="p-4">
        <div className="flex justify-between items-start mb-3 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {coverPhoto ? (
              <img
                src={photosApi.getPublicUrl(coverPhoto.filePath.replace('public/', ''))}
                alt={plan.partnerName}
                className="w-12 h-12 rounded-full object-cover border-2 border-primary-container flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center border-2 border-primary-container flex-shrink-0">
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-body-lg text-primary font-bold truncate">{plan.partnerName}</h3>
              <p className="text-label-sm text-outline uppercase tracking-wider">
                {format(new Date(plan.planDate), 'd MMMM yyyy', { locale: fr })}
              </p>
            </div>
          </div>

          {plan.score != null ? (
            <div className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-bold text-body-md">
              {plan.score}
              <span className="text-label-sm">/20</span>
            </div>
          ) : null}
        </div>

        {plan.description ? (
          <p className="text-on-surface-variant text-body-md mb-3 line-clamp-2 italic">&quot;{plan.description}&quot;</p>
        ) : null}

        <div className="flex flex-wrap gap-1">
          {plan.tags.slice(0, 3).map(({ tag }) => (
            <span
              key={tag.id}
              className="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-full text-label-sm"
            >
              #{tag.name}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

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

  const now = new Date();
  const plansThisMonth = plans.filter((plan) => {
    const d = new Date(plan.planDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const recentPlans = plans.slice(0, 3);
  const favoriteTags: FavoriteTag[] = stats?.favoriteTags ?? [];
  const maxTagCount = favoriteTags[0]?.count ?? 1;
  const firstName = user?.displayName?.split(' ')[0] ?? 'toi';

  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="sticky top-0 bg-surface z-40 flex justify-between items-center px-4 py-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-lg">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              celebration
            </span>
          </div>
          <h1 className="text-headline-lg text-primary font-black tracking-tight">Matedex</h1>
        </div>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="w-10 h-10 rounded-full border-2 border-primary-container overflow-hidden active:scale-95 transition-transform duration-200"
        >
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar utilisateur" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
            </div>
          )}
        </button>
      </header>

      <main className="px-4 mt-6 space-y-8 max-w-2xl mx-auto">
        <section className="space-y-1">
          <h2 className="text-headline-md text-on-background">Salut, {firstName} !</h2>
          <p className="text-body-lg text-on-surface-variant">Un ete riche en couleurs ! Continue tes decouvertes.</p>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <StatCard
            value={plansThisMonth}
            label="Plans ce mois"
            subtitle={`sur ${plans.length} total`}
            variant="primary"
          />
          <StatCard
            value={plans.length}
            label="Plans cette annee"
            subtitle="En progression"
            variant="secondary"
          />
        </section>

        {favoriteTags.length > 0 ? (
          <section className="bg-surface-container-low rounded-lg p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-md text-on-surface">Tags favoris</h3>
              <span className="material-symbols-outlined text-primary">analytics</span>
            </div>
            <div className="space-y-4">
              {favoriteTags.map((tag) => (
                <TagProgressBar key={tag.name} name={tag.name} count={tag.count} max={maxTagCount} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-headline-md text-on-surface">Derniers plans</h3>
            <Link
              to="/plans"
              className="text-label-lg text-primary active:scale-95 transition-transform duration-200 whitespace-nowrap"
            >
              Voir tout
            </Link>
          </div>

          {recentPlans.length === 0 ? (
            <div className="text-center py-12 bg-surface-container rounded-lg">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-3 block">add_circle</span>
              <p className="text-body-lg text-on-surface-variant mb-4">Ton premier plan t&apos;attend !</p>
              <button
                type="button"
                onClick={() => navigate('/plans/new')}
                className="bg-primary text-on-primary px-6 py-3 rounded-full text-label-lg font-semibold active:scale-95 transition-transform duration-200"
              >
                Ajouter un plan
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

      <button
        type="button"
        onClick={() => navigate('/plans/new')}
        className="fixed bottom-20 right-4 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center z-40 active:scale-95 transition-transform duration-200"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>
    </div>
  );
}
