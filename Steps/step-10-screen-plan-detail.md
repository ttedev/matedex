# Step 10 — Écran Détails du Plan (PlanDetailPage)

## Objectif
Implémenter la vue complète d'une rencontre :
- En-tête avec photo de couverture (plein écran), nom, note
- Informations détaillées (âge, taille, catégorie, date, lieu)
- Carte Leaflet avec localisation exacte
- Galerie photos classiques
- Zone photos NSFW (verrouillée par défaut, déverrouillage par tap + confirmation)
- Description complète ("L'histoire")
- Tags
- Bouton modifier + supprimer

## Référence Visuelle
Fichier maquette : `Spec/d_tails_du_plan_v2_matedex_2/code.html`

---

## Fichier à Créer

### `frontend/src/pages/PlanDetailPage.tsx`
```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { plansApi } from '../api/plans';
import { photosApi } from '../api/photos';

// Fix icône Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const BACKEND = import.meta.env.VITE_API_URL;

const CATEGORY_LABELS: Record<string, string> = {
  plage: '🏖️ Plage',
  soiree: '🎉 Soirée',
  festival: '🎪 Festival',
  autre: '✨ Autre',
};

const BANANA_LABELS: Record<string, string> = {
  S: 'Petit 🍌',
  M: 'Moyen 🍌🍌',
  L: 'Grand 🍌🍌🍌',
  XL: 'Très grand 🍌🍌🍌🍌',
};

// ---- Composant galerie photo ----
function PhotoGallery({ photos, isNsfw }: { photos: any[]; isNsfw: boolean }) {
  const [nsfwUnlocked, setNsfwUnlocked] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (isNsfw && !nsfwUnlocked) {
    return (
      <div
        className="rounded-lg border-2 border-dashed border-tertiary/40 bg-tertiary-fixed/10 p-8 flex flex-col items-center gap-3 cursor-pointer"
        onClick={() => {
          if (confirm('Afficher les photos privées ?')) {
            setNsfwUnlocked(true);
          }
        }}
      >
        <span className="material-symbols-outlined text-5xl text-tertiary">lock</span>
        <p className="text-label-lg text-tertiary font-bold">Photos privées</p>
        <p className="text-label-sm text-on-surface-variant text-center">
          {photos.length} photo{photos.length > 1 ? 's' : ''} · Appuie pour déverrouiller
        </p>
      </div>
    );
  }

  const getUrl = (photo: any) => {
    if (isNsfw) {
      return photosApi.getPrivateUrl(photo.filePath.replace('private/', ''));
    }
    return `${BACKEND}/uploads/public/${photo.filePath.replace('public/', '')}`;
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <img
            key={photo.id}
            src={getUrl(photo)}
            alt=""
            onClick={() => setSelectedPhoto(getUrl(photo))}
            className="w-full aspect-square object-cover rounded-lg cursor-pointer active:opacity-80 transition-opacity"
          />
        ))}
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt=""
            className="max-w-full max-h-full rounded-lg object-contain"
          />
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"
            onClick={() => setSelectedPhoto(null)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
    </>
  );
}

// ============================================================
// Page principale
// ============================================================

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan', id],
    queryFn: () => plansApi.getById(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => plansApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      navigate('/plans');
    },
  });

  function handleDelete() {
    if (confirm('Supprimer ce plan définitivement ?')) {
      deleteMutation.mutate();
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface px-4">
        <span className="material-symbols-outlined text-5xl text-on-surface-variant">error</span>
        <p className="text-body-lg text-on-surface">Plan introuvable.</p>
        <button onClick={() => navigate('/plans')} className="text-primary text-label-lg">
          ← Retour
        </button>
      </div>
    );
  }

  const publicPhotos = plan.photos.filter((p) => !p.isNsfw);
  const nsfwPhotos = plan.photos.filter((p) => p.isNsfw);
  const coverPhoto = publicPhotos[0];

  return (
    <div className="bg-background min-h-screen pb-24">
      {/* Hero photo ou fond dégradé */}
      <div className="relative h-56 w-full overflow-hidden">
        {coverPhoto ? (
          <img
            src={`${BACKEND}/uploads/public/${coverPhoto.filePath.replace('public/', '')}`}
            alt={plan.partnerName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: 'linear-gradient(135deg, #e31754 0%, #006b5f 100%)' }}
          />
        )}
        {/* Overlay dégradé bas */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />

        {/* Bouton retour */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        {/* Actions (modifier / supprimer) */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleDelete}
            className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <div className="px-4 -mt-8 relative z-10 space-y-6">
        {/* Nom + date + note */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-display-lg-mobile text-primary font-black tracking-tight">
              {plan.partnerName}
            </h1>
            <p className="text-body-md text-on-surface-variant">
              {format(new Date(plan.planDate), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
            </p>
          </div>
          {plan.score != null && (
            <div className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-full flex flex-col items-center">
              <span className="text-2xl font-black">{plan.score}</span>
              <span className="text-label-sm">/20</span>
            </div>
          )}
        </div>

        {/* Chips d'infos rapides */}
        <div className="flex flex-wrap gap-2">
          <span className="bg-surface-container-high text-on-surface px-3 py-1.5 rounded-full text-label-lg flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">cake</span>
            {plan.partnerAge ? `${plan.partnerAge} ans` : '? ans'}
          </span>
          {plan.category && (
            <span className="bg-surface-container-high text-on-surface px-3 py-1.5 rounded-full text-label-lg">
              {CATEGORY_LABELS[plan.category]}
            </span>
          )}
          {plan.bananaSize && (
            <span className="bg-surface-container-high text-on-surface px-3 py-1.5 rounded-full text-label-lg">
              {BANANA_LABELS[plan.bananaSize]}
            </span>
          )}
        </div>

        {/* Tags */}
        {plan.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {plan.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-label-sm"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {plan.description && (
          <section className="space-y-2">
            <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">
              L'histoire 📖
            </h2>
            <div className="bg-surface-container p-4 rounded-lg">
              <p className="text-body-md text-on-surface leading-relaxed italic">
                "{plan.description}"
              </p>
            </div>
          </section>
        )}

        {/* Carte Leaflet */}
        {plan.latitude && plan.longitude && (
          <section className="space-y-2">
            <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">location_on</span>
              Lieu
            </h2>
            {plan.locationName && (
              <p className="text-body-md text-on-surface-variant">{plan.locationName}</p>
            )}
            <div className="rounded-lg overflow-hidden border border-outline-variant" style={{ height: '200px' }}>
              <MapContainer
                center={[plan.latitude, plan.longitude]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[plan.latitude, plan.longitude]} />
              </MapContainer>
            </div>
          </section>
        )}

        {/* Photos publiques */}
        {publicPhotos.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">
              Photos ({publicPhotos.length})
            </h2>
            <PhotoGallery photos={publicPhotos} isNsfw={false} />
          </section>
        )}

        {/* Photos NSFW */}
        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">lock</span>
            Photos privées {nsfwPhotos.length > 0 && `(${nsfwPhotos.length})`}
          </h2>
          {nsfwPhotos.length > 0 ? (
            <PhotoGallery photos={nsfwPhotos} isNsfw={true} />
          ) : (
            <p className="text-label-sm text-on-surface-variant italic">Aucune photo privée.</p>
          )}
        </section>

        {/* Bouton supprimer (bas de page) */}
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="w-full py-3 rounded-full border-2 border-error text-error text-label-lg font-semibold flex items-center justify-center gap-2 hover:bg-error/10 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
          Supprimer ce plan
        </button>
      </div>
    </div>
  );
}
```

---

## Résultat Attendu

- Vue complète d'un plan avec toutes ses informations.
- Hero photo en plein largeur avec dégradé.
- Chips d'infos rapides (âge, catégorie, taille).
- Carte Leaflet (en lecture seule) si coordonnées GPS présentes.
- Galerie photos classiques avec lightbox.
- Zone photos NSFW verrouillée → déverrouillage par confirmation.
- Bouton supprimer avec confirmation native.
- Redirection vers `/plans` après suppression.
