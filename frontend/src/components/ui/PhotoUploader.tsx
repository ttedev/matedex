import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { photosApi } from '../../api/photos';

interface PhotoUploaderProps {
  planId: string;
  isNsfw?: boolean;
  label: string;
  onUploadSuccess: () => void;
}

interface ApiErrorPayload {
  error?: string;
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
    } catch (err: unknown) {
      if (isAxiosError<ApiErrorPayload>(err)) {
        setError(err.response?.data?.error ?? "Erreur lors de l'upload.");
      } else {
        setError("Erreur lors de l'upload.");
      }
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
          transition-all duration-200 cursor-pointer active:scale-95
          ${
            isNsfw
              ? 'border-tertiary/40 bg-tertiary-container/40 hover:border-tertiary'
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

        {isNsfw ? (
          <span className="text-label-sm text-tertiary bg-tertiary-container px-2 py-0.5 rounded-full">
            Prive · NSFW
          </span>
        ) : null}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleFile(file);
          }
          event.target.value = '';
        }}
      />

      {error ? <p className="text-label-sm text-error">{error}</p> : null}
    </div>
  );
}