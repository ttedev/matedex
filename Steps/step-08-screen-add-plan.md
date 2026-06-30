# Step 08 — Écran Ajouter un Plan (AddPlanPage)

## Objectif
Implémenter le formulaire complet d'ajout d'une rencontre, l'écran le plus complexe de l'application.

Champs :
- **Qui** : nom/alias du partenaire
- **Âge** : slider 18–99
- **Lieu** : carte Leaflet + recherche d'adresse (Nominatim OpenStreetMap)
- **Tags** : TagPicker (système + personnalisés)
- **Taille** : BananaSlider (S/M/L/XL)
- **Description** : textarea libre
- **Note** : slider 0–20 avec affichage étoiles
- **Catégorie** : plage / soirée / festival / autre
- **Date** : date picker
- **Photos** : upload classique + upload NSFW (après création du plan)

## Référence Visuelle
Fichier maquette : `Spec/ajouter_un_plan_v4_matedex/code.html`

---

## Composant Carte Leaflet

### `frontend/src/components/ui/MapPicker.tsx`
```tsx
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix icône Leaflet avec Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  lat?: number;
  lng?: number;
  onLocationChange: (lat: number, lng: number, name: string) => void;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ lat, lng, onLocationChange }: MapPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    lat && lng ? [lat, lng] : null
  );
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`
      );
      const data = await res.json();
      return data.display_name ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  async function handleMapClick(lat: number, lng: number) {
    setPosition([lat, lng]);
    const name = await reverseGeocode(lat, lng);
    onLocationChange(lat, lng, name);
  }

  async function handleSearch() {
    if (!search.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=1&accept-language=fr`
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat: sLat, lon: sLng, display_name } = data[0];
        const newPos: [number, number] = [parseFloat(sLat), parseFloat(sLng)];
        setPosition(newPos);
        mapRef.current?.flyTo(newPos, 13);
        onLocationChange(newPos[0], newPos[1], display_name);
      }
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Barre de recherche */}
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
          placeholder="Rechercher un lieu..."
          className="flex-1 px-4 py-3 rounded-lg bg-surface-container border border-outline-variant text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-3 bg-primary text-on-primary rounded-lg disabled:opacity-50"
        >
          <span className="material-symbols-outlined">search</span>
        </button>
      </div>

      {/* Carte */}
      <div className="rounded-lg overflow-hidden border border-outline-variant" style={{ height: '250px' }}>
        <MapContainer
          center={position ?? [48.8566, 2.3522]}
          zoom={position ? 13 : 5}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onClick={handleMapClick} />
          {position && <Marker position={position} />}
        </MapContainer>
      </div>
      <p className="text-label-sm text-on-surface-variant text-center">
        Clique sur la carte pour placer le lieu de la rencontre.
      </p>
    </div>
  );
}
```

---

## Composant Upload Photos

### `frontend/src/components/ui/PhotoUploader.tsx`
```tsx
import { useRef, useState } from 'react';
import { photosApi } from '../../api/photos';

interface PhotoUploaderProps {
  planId: string;
  isNsfw?: boolean;
  label: string;
  onUploadSuccess: () => void;
}

export default function PhotoUploader({
  planId,
  isNsfw = false,
  label,
  onUploadSuccess,
}: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    setIsUploading(true);
    setError('');
    try {
      await photosApi.upload(planId, file, isNsfw);
      onUploadSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Erreur lors de l'upload.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className={`
          flex flex-col items-center justify-center gap-2
          border-2 border-dashed rounded-lg p-6
          transition-colors cursor-pointer
          ${isNsfw
            ? 'border-tertiary/40 bg-tertiary-fixed/20 hover:border-tertiary'
            : 'border-outline-variant hover:border-primary'
          }
          disabled:opacity-50
        `}
      >
        <span className={`material-symbols-outlined text-4xl ${isNsfw ? 'text-tertiary' : 'text-primary'}`}>
          {isUploading ? 'progress_activity' : 'add_photo_alternate'}
        </span>
        <span className="text-label-lg text-on-surface-variant">
          {isUploading ? 'Upload en cours...' : label}
        </span>
        {isNsfw && (
          <span className="text-label-sm text-tertiary bg-tertiary-fixed/40 px-2 py-0.5 rounded-full">
            🔒 Privé · NSFW
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {error && <p className="text-label-sm text-error">{error}</p>}
    </div>
  );
}
```

---

## Page Principale

### `frontend/src/pages/AddPlanPage.tsx`
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '../api/plans';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import TagPicker from '../components/ui/TagPicker';
import BananaSlider from '../components/ui/BananaSlider';
import MapPicker from '../components/ui/MapPicker';
import PhotoUploader from '../components/ui/PhotoUploader';

// ============================================================
// Validation
// ============================================================

const schema = z.object({
  partnerName: z.string().min(1, 'Le nom est requis').max(100),
  partnerAge: z.number().int().min(18).max(99).optional().nullable(),
  bananaSize: z.enum(['S', 'M', 'L', 'XL']).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  locationName: z.string().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  score: z.number().int().min(0).max(20).optional().nullable(),
  planDate: z.string(),
  category: z.enum(['plage', 'soiree', 'festival', 'autre']),
  tagIds: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

const CATEGORIES = [
  { value: 'plage', label: '🏖️ Plage' },
  { value: 'soiree', label: '🎉 Soirée' },
  { value: 'festival', label: '🎪 Festival' },
  { value: 'autre', label: '✨ Autre' },
] as const;

// ============================================================
// Page
// ============================================================

export default function AddPlanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);
  const [apiError, setApiError] = useState('');

  const { register, control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      planDate: new Date().toISOString().split('T')[0],
      category: 'autre',
      tagIds: [],
    },
  });

  const createPlan = useMutation({
    mutationFn: (data: FormValues) =>
      plansApi.create({
        ...data,
        partnerAge: data.partnerAge ?? undefined,
        bananaSize: data.bananaSize ?? undefined,
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
        locationName: data.locationName ?? undefined,
        description: data.description ?? undefined,
        score: data.score ?? undefined,
        planDate: data.planDate ? new Date(data.planDate).toISOString() : undefined,
      }),
    onSuccess: (plan) => {
      setCreatedPlanId(plan.id);
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (err: any) => {
      setApiError(err.response?.data?.error ?? 'Erreur lors de la création.');
    },
  });

  const tagIds = watch('tagIds');
  const score = watch('score') ?? 10;
  const partnerAge = watch('partnerAge') ?? 25;

  // ---- Étape 2 : Photos ----
  if (createdPlanId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 bg-surface px-4 py-4 flex items-center gap-3 border-b border-outline-variant/30 z-10">
          <span className="text-headline-md text-on-surface font-bold">Photos</span>
        </header>
        <div className="px-4 py-6 space-y-6 max-w-lg mx-auto w-full">
          <div className="text-center space-y-2">
            <span className="material-symbols-outlined text-5xl text-secondary">check_circle</span>
            <h2 className="text-headline-md text-on-surface font-bold">Plan créé ! 🎉</h2>
            <p className="text-body-md text-on-surface-variant">Ajoute maintenant tes photos (optionnel).</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-label-lg text-on-surface uppercase tracking-wider">Photos classiques</h3>
            <PhotoUploader
              planId={createdPlanId}
              isNsfw={false}
              label="Ajouter une photo"
              onUploadSuccess={() => {}}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-label-lg text-on-surface uppercase tracking-wider">Photos privées</h3>
            <PhotoUploader
              planId={createdPlanId}
              isNsfw={true}
              label="Ajouter une photo privée"
              onUploadSuccess={() => {}}
            />
          </div>

          <Button
            fullWidth
            size="lg"
            onClick={() => navigate(`/plans/${createdPlanId}`)}
          >
            Voir mon plan →
          </Button>
          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/plans')}
          >
            Revenir à Mes Plans
          </Button>
        </div>
      </div>
    );
  }

  // ---- Étape 1 : Formulaire ----
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 bg-surface px-4 py-4 flex items-center gap-3 border-b border-outline-variant/30 z-10">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-headline-md text-on-surface font-bold">Nouveau Plan</h1>
      </header>

      <form onSubmit={handleSubmit((data) => createPlan.mutate(data))} className="flex flex-col gap-6 px-4 py-6 pb-32 max-w-lg mx-auto w-full">

        {/* Qui */}
        <section className="space-y-2">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Qui ?</h2>
          <Input
            label="Nom ou alias"
            placeholder="Ex: Alex, Sunny..."
            {...register('partnerName')}
            error={errors.partnerName?.message}
          />
        </section>

        {/* Âge */}
        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Âge</h2>
          <div className="bg-surface-container p-4 rounded-lg space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-body-md text-on-surface-variant">18 ans</span>
              <span className="text-headline-md text-primary font-bold">{partnerAge} ans</span>
              <span className="text-body-md text-on-surface-variant">99 ans</span>
            </div>
            <Controller
              control={control}
              name="partnerAge"
              render={({ field }) => (
                <input
                  type="range"
                  min={18}
                  max={99}
                  value={field.value ?? 25}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              )}
            />
          </div>
        </section>

        {/* Catégorie */}
        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Catégorie</h2>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => field.onChange(cat.value)}
                    className={`px-4 py-2 rounded-full text-label-lg transition-colors ${
                      field.value === cat.value
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant border border-outline-variant'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          />
        </section>

        {/* Date */}
        <section className="space-y-2">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Date</h2>
          <Input type="date" {...register('planDate')} />
        </section>

        {/* Lieu */}
        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Lieu</h2>
          <MapPicker
            lat={watch('latitude') ?? undefined}
            lng={watch('longitude') ?? undefined}
            onLocationChange={(lat, lng, name) => {
              setValue('latitude', lat);
              setValue('longitude', lng);
              setValue('locationName', name);
            }}
          />
          {watch('locationName') && (
            <p className="text-label-sm text-on-surface-variant text-center">
              📍 {watch('locationName')}
            </p>
          )}
        </section>

        {/* Tags */}
        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Tags</h2>
          <Controller
            control={control}
            name="tagIds"
            render={({ field }) => (
              <TagPicker selectedIds={field.value} onChange={field.onChange} />
            )}
          />
        </section>

        {/* Taille (Banana Slider) */}
        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">
            Taille 🍌
          </h2>
          <Controller
            control={control}
            name="bananaSize"
            render={({ field }) => (
              <BananaSlider
                value={field.value ?? undefined}
                onChange={field.onChange}
              />
            )}
          />
        </section>

        {/* Description */}
        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">
            Détails croustillants 🌶️
          </h2>
          <textarea
            placeholder="Raconte ta rencontre..."
            rows={4}
            {...register('description')}
            className="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant text-body-md text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </section>

        {/* Note */}
        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">
            Note /20
          </h2>
          <div className="bg-surface-container p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-body-md text-on-surface-variant">0</span>
              <span className="text-display-lg-mobile text-primary font-black">{score}</span>
              <span className="text-body-md text-on-surface-variant">20</span>
            </div>
            <Controller
              control={control}
              name="score"
              render={({ field }) => (
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={field.value ?? 10}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
              )}
            />
            <div className="flex justify-center">
              {'⭐'.repeat(Math.round((score / 20) * 5))}
            </div>
          </div>
        </section>

        {/* Erreur API */}
        {apiError && (
          <p className="text-label-sm text-error text-center bg-error-container/30 py-3 px-4 rounded-lg">
            {apiError}
          </p>
        )}

        {/* Bouton submit */}
        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isSubmitting}
          className="shadow-[0_10px_25px_-5px_rgba(185,0,64,0.3)]"
        >
          Créer le Plan 🌈
        </Button>
      </form>
    </div>
  );
}
```

---

## Résultat Attendu

- Formulaire complet et fonctionnel.
- Slider âge (18–99) avec affichage dynamique.
- Carte Leaflet interactive avec géocodage inverse (Nominatim, gratuit).
- TagPicker avec tags système + ajout de tags personnalisés.
- BananaSlider pour la taille (S/M/L/XL).
- Slider note 0–20 avec étoiles.
- Après soumission, affichage de l'étape "Photos" (classiques + NSFW).
- Navigation vers le détail du plan après upload des photos.
