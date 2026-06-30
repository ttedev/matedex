import apiClient from './client';

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}

export const photosApi = {
  upload: (planId: string, file: File, isNsfw: boolean) => {
    const form = new FormData();
    form.append('photo', file);
    form.append('planId', planId);
    form.append('isNsfw', String(isNsfw));
    return apiClient.post('/photos/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getPublicUrl: (filename: string) =>
    buildUrl(`/uploads/public/${filename}`),

  getPrivateUrl: (filename: string) =>
    buildUrl(`/photos/private/${filename}`),

  getPrivateBlob: (filename: string) =>
    apiClient
      .get<Blob>(`/photos/private/${filename}`, { responseType: 'blob' })
      .then((response) => response.data),

  delete: (id: string) => apiClient.delete(`/photos/${id}`),
};