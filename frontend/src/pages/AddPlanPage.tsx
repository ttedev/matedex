import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { plansApi } from '../api/plans';
import BananaSlider from '../components/ui/BananaSlider';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import MapPicker from '../components/ui/MapPicker';
import PhotoUploader from '../components/ui/PhotoUploader';
import TagPicker from '../components/ui/TagPicker';

const createPlanSchema = z.object({
  partnerName: z.string().trim().min(1, 'Le nom est requis').max(100, 'Le nom est trop long'),
  partnerAge: z.number().int().min(18).max(99).optional().nullable(),
  bananaSize: z.enum(['S', 'M', 'L', 'XL']).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  locationName: z.string().optional().nullable(),
  description: z.string().max(5000, 'La description est trop longue').optional().nullable(),
  score: z.number().int().min(0).max(20).optional().nullable(),
  planDate: z.string().min(1, 'La date est requise'),
  category: z.enum(['plage', 'soiree', 'festival', 'autre']),
  tagIds: z.array(z.string()),
});

type FormValues = z.infer<typeof createPlanSchema>;

interface ApiErrorPayload {
  error?: string;
}

const CATEGORIES: ReadonlyArray<{ value: FormValues['category']; label: string }> = [
  { value: 'plage', label: 'Plage' },
  { value: 'soiree', label: 'Soiree' },
  { value: 'festival', label: 'Festival' },
  { value: 'autre', label: 'Autre' },
];

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<ApiErrorPayload>(error)) {
    return error.response?.data?.error ?? fallback;
  }
  return fallback;
}

export default function AddPlanPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createdPlanId, setCreatedPlanId] = useState<string | null>(null);
  const [apiError, setApiError] = useState('');

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      planDate: new Date().toISOString().split('T')[0],
      category: 'autre',
      tagIds: [],
      partnerAge: 25,
      score: 10,
    },
  });

  const createPlanMutation = useMutation({
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
      setApiError('');
      void queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (error: unknown) => {
      setApiError(getErrorMessage(error, 'Erreur lors de la creation du plan.'));
    },
  });

  const score = watch('score') ?? 10;
  const partnerAge = watch('partnerAge') ?? 25;
  const locationName = watch('locationName');
  const latitude = watch('latitude') ?? undefined;
  const longitude = watch('longitude') ?? undefined;

  if (createdPlanId) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 bg-surface px-4 py-4 flex items-center gap-3 border-b border-outline-variant/30 z-10">
          <span className="text-headline-md text-on-surface font-bold">Photos</span>
        </header>

        <div className="px-4 py-6 space-y-6 max-w-lg mx-auto w-full">
          <div className="text-center space-y-2">
            <span className="material-symbols-outlined text-5xl text-secondary">check_circle</span>
            <h2 className="text-headline-md text-on-surface font-bold">Plan cree !</h2>
            <p className="text-body-md text-on-surface-variant">Ajoute maintenant tes photos (optionnel).</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-label-lg text-on-surface uppercase tracking-wider">Photos classiques</h3>
            <PhotoUploader
              planId={createdPlanId}
              isNsfw={false}
              label="Ajouter une photo"
              onUploadSuccess={() => undefined}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-label-lg text-on-surface uppercase tracking-wider">Photos privees</h3>
            <PhotoUploader
              planId={createdPlanId}
              isNsfw
              label="Ajouter une photo privee"
              onUploadSuccess={() => undefined}
            />
          </div>

          <Button
            fullWidth
            size="lg"
            onClick={() => navigate(`/plans/${createdPlanId}`)}
          >
            Voir mon plan
          </Button>

          <Button
            fullWidth
            variant="text"
            onClick={() => navigate('/plans')}
          >
            Revenir a Mes Plans
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 bg-surface px-4 py-4 flex items-center gap-3 border-b border-outline-variant/30 z-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container-high transition-all duration-200 active:scale-95"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-headline-md text-on-surface font-bold">Nouveau Plan</h1>
      </header>

      <form
        onSubmit={handleSubmit((data) => createPlanMutation.mutate(data))}
        className="flex flex-col gap-6 px-4 py-6 pb-32 max-w-lg mx-auto w-full"
      >
        <section className="space-y-2">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Qui ?</h2>
          <Input
            label="Nom ou alias"
            placeholder="Ex: Alex, Sunny..."
            {...register('partnerName')}
            error={errors.partnerName?.message}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Age</h2>
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
                  onChange={(event) => field.onChange(Number.parseInt(event.target.value, 10))}
                  className="w-full accent-primary"
                />
              )}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Categorie</h2>
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
                    className={`
                      px-4 py-2 rounded-full text-label-lg transition-all duration-200 active:scale-95
                      ${
                        field.value === cat.value
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-high text-on-surface-variant border border-outline-variant'
                      }
                    `}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          />
        </section>

        <section className="space-y-2">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Date</h2>
          <Input type="date" {...register('planDate')} error={errors.planDate?.message} />
        </section>

        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Lieu</h2>
          <MapPicker
            lat={latitude}
            lng={longitude}
            onLocationChange={(nextLat, nextLng, name) => {
              setValue('latitude', nextLat, { shouldDirty: true });
              setValue('longitude', nextLng, { shouldDirty: true });
              setValue('locationName', name, { shouldDirty: true });
            }}
          />
          {locationName ? (
            <p className="text-label-sm text-on-surface-variant text-center">{locationName}</p>
          ) : null}
        </section>

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

        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Taille</h2>
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

        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Description</h2>
          <textarea
            placeholder="Raconte ta rencontre..."
            rows={4}
            {...register('description')}
            className="w-full px-4 py-3 rounded-lg bg-surface-container border border-outline-variant text-body-md text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          {errors.description?.message ? <p className="text-label-sm text-error">{errors.description.message}</p> : null}
        </section>

        <section className="space-y-3">
          <h2 className="text-label-lg text-on-surface-variant uppercase tracking-wider">Note /20</h2>
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
                  onChange={(event) => field.onChange(Number.parseInt(event.target.value, 10))}
                  className="w-full accent-primary"
                />
              )}
            />

            <div className="flex justify-center">
              {'*'.repeat(Math.round((score / 20) * 5))}
            </div>
          </div>
        </section>

        {apiError ? (
          <p className="text-label-sm text-error text-center bg-error-container/30 py-3 px-4 rounded-lg">
            {apiError}
          </p>
        ) : null}

        <Button
          type="submit"
          fullWidth
          size="lg"
          isLoading={isSubmitting || createPlanMutation.isPending}
          className="shadow-lg"
        >
          Creer le Plan
        </Button>
      </form>
    </div>
  );
}
