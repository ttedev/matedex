# Step 09 — Écran Mes Plans (MyPlansPage)

## Objectif
Implémenter la liste chronologique des rencontres avec :
- Filtre par catégorie (chips horizontaux scrollables)
- Cartes avec photo, nom, score, date, tags
- Barre arc-en-ciel en haut de chaque carte
- Navigation vers le détail d'un plan
- État vide avec CTA

## Référence Visuelle
Fichier maquette : `Spec/mes_plans_matedex/code.html`

---

## Fichier à Créer

### `frontend/src/pages/MyPlansPage.tsx`
```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { plansApi, type Plan } from '../api/plans';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const FILTERS = [
  { label: 'Tout', value: undefined },
  { label: '🏖️ Plage', value: 'plage' },
  { label: '🎉 Soirée', value: 'soiree' },
  { label: '🎪 Festival', value: 'festival' },
  { label: '✨ Autre', value: 'autre' },
] as const;

// ---- Composant carte plan ----
function PlanCard({ plan }: { plan: Plan }) {
  const navigate = useNavigate();
  const BACKEND = import.meta.env.VITE_API_URL;
  const coverPhoto = plan.photos.find((p) => !p.isNsfw);

  return (
    <div
      onClick={() => navigate(`/plans/${plan.id}`)}
      className="bg-surface-container-lowest rounded-lg overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-200 flex flex-col"
      style={{ boxShadow: '0 10px 15px -3px rgba(185,0,64,0.1), 0 4px 6px -2px rgba(185,0,64,0.05)' }}
    >
      {/* Barre arc-en-ciel */}
      <div
        className="h-1 w-full flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, #ff3366, #ff9933, #ffff33, #33cc33, #3366ff, #9933ff)' }}
      />

      <div className="p-4 flex flex-col gap-3">
        {/* En-tête : avatar + nom + note */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            {coverPhoto ? (
              <img
                src={`${BACKEND}/uploads/public/${coverPhoto.filePath.replace('public/', '')}`}
                alt={plan.partnerName}
                className="w-14 h-14 rounded-full object-cover border-2 border-primary-container flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-surface-container-high border-2 border-primary-container flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-on-surface-variant text-xl">person</span>
              </div>
            )}
            <div>
              <h3 className="text-headline-md text-primary font-bold line-clamp-1">
                {plan.partnerName}
              </h3>
              <p className="text-label-sm text-outline uppercase tracking-wider">
                {format(new Date(plan.planDate), 'd MMM yyyy', { locale: fr })}
              </p>
              {plan.locationName && (
                <p className="text-label-sm text-on-surface-variant flex items-center gap-0.5 mt-0.5">
                  <span className="material-symbols-outlined text-xs">location_on</span>
                  <span className="line-clamp-1">{plan.locationName}</span>
                </p>
              )}
            </div>
          </div>
          {plan.score != null && (
            <div className="bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-full font-bold text-lg flex-shrink-0">
              {plan.score}
              <span className="text-xs font-normal">/20</span>
            </div>
          )}
        </div>

        {/* Description */}
        {plan.description && (
          <p className="text-on-surface-variant text-body-md line-clamp-2 italic">
            "{plan.description}"
          </p>
        )}

        {/* Tags */}
        {plan.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {plan.tags.slice(0, 4).map(({ tag }) => (
              <span
                key={tag.id}
                className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full text-label-sm border border-outline-variant/50"
              >
                #{tag.name}
              </span>
            ))}
            {plan.tags.length > 4 && (
              <span className="text-label-sm text-on-surface-variant px-2 py-1">
                +{plan.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Taille banane */}
        {plan.bananaSize && (
          <div className="flex items-center gap-1">
            <span className="text-sm">🍌</span>
            <span className="text-label-sm text-on-surface-variant">{plan.bananaSize}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Page principale
// ============================================================

export default function MyPlansPage() {
  const [activeFilter, setActiveFilter] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans', activeFilter],
    queryFn: () => plansApi.getAll(activeFilter),
  });

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-surface z-50 flex justify-between items-center px-4 py-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
            <span className="material-symbols-outlined text-base">list_alt</span>
          </div>
          <h1 className="text-display-lg-mobile text-primary tracking-tight font-black">Matedex</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-primary-container overflow-hidden cursor-pointer"
            onClick={() => navigate('/profile')}>
            <div className="w-full h-full bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-sm">person</span>
            </div>
          </div>
          <button className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      <main className="px-4 pt-5">
        {/* Titre section */}
        <section className="mb-5">
          <h2 className="text-headline-lg text-on-background font-bold mb-1">Derniers plans</h2>
          <p className="text-on-surface-variant text-body-md">
            Retrouve tes dernières rencontres et aventures.
          </p>
        </section>

        {/* Filtres catégorie */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setActiveFilter(f.value)}
              className={`px-5 py-2 rounded-full text-label-lg whitespace-nowrap transition-all active:scale-95 flex-shrink-0 ${
                activeFilter === f.value
                  ? 'bg-primary text-on-primary shadow-md'
                  : 'bg-surface-container-high text-on-surface'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Liste des plans */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">
              progress_activity
            </span>
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <span className="material-symbols-outlined text-6xl text-on-surface-variant block">
              beach_access
            </span>
            <h3 className="text-headline-md text-on-surface font-bold">
              {activeFilter ? 'Aucun plan dans cette catégorie' : 'Aucun plan encore'}
            </h3>
            <p className="text-body-md text-on-surface-variant">
              L'été est devant toi ! 🌈
            </p>
            <button
              onClick={() => navigate('/plans/new')}
              className="bg-primary text-on-primary px-6 py-3 rounded-full text-label-lg font-semibold mt-2 shadow-md"
            >
              Ajouter un plan ✨
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
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

---

## Résultat Attendu

- Liste de toutes les rencontres, triées par date décroissante.
- Filtres par catégorie (chips scrollables horizontalement).
- Chaque carte affiche : photo de couverture, nom, date, lieu (si défini), score, tags, taille banane (si défini).
- Barre arc-en-ciel en haut de chaque carte.
- Clic sur une carte → navigation vers `/plans/:id`.
- État vide stylisé avec CTA.
- FAB en bas à droite pour ajouter rapidement.
