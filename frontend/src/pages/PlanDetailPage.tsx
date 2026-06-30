import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { plansApi, type Plan } from '../api/plans';
import { photosApi } from '../api/photos';

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORY_LABELS: Record<Plan['category'], string> = {
  plage: '🏖️ Plage',
  soiree: '🎉 Soirée',
  festival: '🎪 Festival',
  autre: '✨ Autre',
};

const BANANA_LABELS: Record<NonNullable<Plan['bananaSize']>, string> = {
  S: 'Petit 🍌',
  M: 'Moyen 🍌🍌',
  L: 'Grand 🍌🍌🍌',
  XL: 'Très grand 🍌🍌🍌🍌',
};

type Photo = Plan['photos'][number];

interface PhotoGalleryProps {
  photos: Photo[];
  isNsfw: boolean;
}

function PhotoGallery({ photos, isNsfw }: PhotoGalleryProps) {
  const [nsfwUnlocked, setNsfwUnlocked] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [privateUrls, setPrivateUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let canceled = false;

    async function loadPrivatePhotos(): Promise<void> {
      if (!isNsfw || !nsfwUnlocked || photos.length === 0) {
        return;
      }

      try {
        const entries = await Promise.all(
          photos.map(async (photo) => {
            const filename = photo.filePath.replace('private/', '');
            const blob = await photosApi.getPrivateBlob(filename);
            return [photo.id, URL.createObjectURL(blob)] as const;
          }),
        );

        if (canceled) {
          entries.forEach(([, url]) => URL.revokeObjectURL(url));
          return;
        }

        setPrivateUrls((previous) => {
          Object.values(previous).forEach((url) => URL.revokeObjectURL(url));
          return Object.fromEntries(entries);
        });
      } catch {
        if (!canceled) {
          setPrivateUrls({});
        }
      }
    }

    void loadPrivatePhotos();

    return () => {
      canceled = true;
    };
  }, [isNsfw, nsfwUnlocked, photos]);

  useEffect(() => {
    return () => {
      Object.values(privateUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [privateUrls]);

  if (isNsfw && !nsfwUnlocked) {
    return (
      <div
        className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-tertiary/40 bg-tertiary-container/20 p-8 active:scale-95 transition-transform duration-200"
        onClick={() => {
          if (window.confirm('Afficher les photos privées ?')) {
            setNsfwUnlocked(true);
          }
        }}
      >
        <span className="material-symbols-outlined text-5xl text-tertiary">lock</span>
        <p className="text-label-lg font-bold text-tertiary">Photos privées</p>
        <p className="text-center text-label-sm text-on-surface-variant">
          {photos.length} photo{photos.length > 1 ? 's' : ''} · Appuie pour déverrouiller
        </p>
      </div>
    );
  }

  const getUrl = (photo: Photo) => {
    if (isNsfw) {
      return privateUrls[photo.id] ?? '';
    }
    return photosApi.getPublicUrl(photo.filePath.replace('public/', ''));
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => {
          const photoUrl = getUrl(photo);
          if (!photoUrl) {
            return (
              <div
                key={photo.id}
                className="aspect-square w-full animate-pulse rounded-lg bg-surface-container-high"
              />
            );
          }
          return (
            <img
              key={photo.id}
              src={photoUrl}
              alt="Photo du plan"
              onClick={() => setSelectedPhoto(photoUrl)}
              className="aspect-square w-full cursor-pointer rounded-lg object-cover transition-all duration-200 active:scale-95 active:opacity-80"
            />
          );
        })}
      </div>

      {selectedPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img
            src={selectedPhoto}
            alt="Photo agrandie"
            className="max-h-full max-w-full rounded-lg object-contain"
          />
          <button
            type="button"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white active:scale-95 transition-transform duration-200"
            onClick={() => setSelectedPhoto(null)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      ) : null}
    </>
  );
}

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan', id],
    queryFn: () => plansApi.getById(id as string),
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => plansApi.delete(id as string),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
      await queryClient.invalidateQueries({ queryKey: ['plan', id] });
      navigate('/plans');
    },
  });

  const handleDelete = () => {
    if (window.confirm('Supprimer ce plan définitivement ?')) {
      deleteMutation.mutate();
    }
  };

  const handleEdit = () => {
    window.alert('La modification de plan arrive bientôt.');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-surface">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-surface px-4">
        <span className="material-symbols-outlined text-5xl text-on-surface-variant">error</span>
        <p className="text-body-lg text-on-surface">Plan introuvable.</p>
        <button
          type="button"
          onClick={() => navigate('/plans')}
          className="text-label-lg text-primary active:scale-95 transition-transform duration-200"
        >
          ← Retour
        </button>
      </div>
    );
  }

  const publicPhotos = plan.photos.filter((photo) => !photo.isNsfw);
  const nsfwPhotos = plan.photos.filter((photo) => photo.isNsfw);
  const coverPhoto = publicPhotos[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="relative h-56 w-full overflow-hidden">
        {coverPhoto ? (
          <img
            src={photosApi.getPublicUrl(coverPhoto.filePath.replace('public/', ''))}
            alt={plan.partnerName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary to-secondary" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm active:scale-95 transition-transform duration-200"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className="absolute right-4 top-4 flex gap-2">
          <button
            type="button"
            onClick={handleEdit}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm active:scale-95 transition-transform duration-200"
            aria-label="Modifier le plan"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm active:scale-95 transition-transform duration-200"
            aria-label="Supprimer le plan"
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      <div className="relative z-10 -mt-8 space-y-6 px-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-display-lg-mobile font-black tracking-tight text-primary">{plan.partnerName}</h1>
            <p className="text-body-md text-on-surface-variant">
              {format(new Date(plan.planDate), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
            </p>
          </div>
          {plan.score != null ? (
            <div className="flex flex-col items-center rounded-full bg-secondary-container px-4 py-2 text-on-secondary-container">
              <span className="text-2xl font-black">{plan.score}</span>
              <span className="text-label-sm">/20</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1 rounded-full bg-surface-container-high px-3 py-1.5 text-label-lg text-on-surface">
            <span className="material-symbols-outlined text-sm">cake</span>
            {plan.partnerAge ? `${plan.partnerAge} ans` : '? ans'}
          </span>

          <span className="rounded-full bg-surface-container-high px-3 py-1.5 text-label-lg text-on-surface">
            {CATEGORY_LABELS[plan.category]}
          </span>

          {plan.bananaSize ? (
            <span className="rounded-full bg-surface-container-high px-3 py-1.5 text-label-lg text-on-surface">
              {BANANA_LABELS[plan.bananaSize]}
            </span>
          ) : null}
        </div>

        {plan.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {plan.tags.map(({ tag }) => (
              <span
                key={tag.id}
                className="rounded-full bg-primary-fixed px-3 py-1 text-label-sm text-on-primary-fixed"
              >
                #{tag.name}
              </span>
            ))}
          </div>
        ) : null}

        {plan.description ? (
          <section className="space-y-2">
            <h2 className="text-label-lg uppercase tracking-wider text-on-surface-variant">L'histoire 📖</h2>
            <div className="rounded-lg bg-surface-container p-4">
              <p className="text-body-md italic leading-relaxed text-on-surface">"{plan.description}"</p>
            </div>
          </section>
        ) : null}

        {plan.latitude != null && plan.longitude != null ? (
          <section className="space-y-2">
            <h2 className="flex items-center gap-1 text-label-lg uppercase tracking-wider text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">location_on</span>
              Lieu
            </h2>
            {plan.locationName ? <p className="text-body-md text-on-surface-variant">{plan.locationName}</p> : null}

            <div className="overflow-hidden rounded-lg border border-outline-variant" style={{ height: '200px' }}>
              <MapContainer
                center={[plan.latitude, plan.longitude]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
              >
                <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[plan.latitude, plan.longitude]} />
              </MapContainer>
            </div>
          </section>
        ) : null}

        {publicPhotos.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-label-lg uppercase tracking-wider text-on-surface-variant">
              Photos ({publicPhotos.length})
            </h2>
            <PhotoGallery photos={publicPhotos} isNsfw={false} />
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="flex items-center gap-1 text-label-lg uppercase tracking-wider text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">lock</span>
            Photos privées {nsfwPhotos.length > 0 ? `(${nsfwPhotos.length})` : ''}
          </h2>

          {nsfwPhotos.length > 0 ? (
            <PhotoGallery photos={nsfwPhotos} isNsfw />
          ) : (
            <p className="text-label-sm italic text-on-surface-variant">Aucune photo privée.</p>
          )}
        </section>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-error py-3 text-label-lg font-semibold text-error transition-colors duration-200 hover:bg-error/10 active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">delete</span>
          Supprimer ce plan
        </button>
      </div>
    </div>
  );
}
