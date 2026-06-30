import apiClient from './client';

export interface ProfileStats {
  totalPlans: number;
  favoriteTags: Array<{ name: string; count: number }>;
  plansByCategory: Array<{ category: string; count: number }>;
}

export const profileApi = {
  get: () =>
    apiClient.get('/profile').then((r) => r.data.user),

  update: (data: { displayName?: string; title?: string }) =>
    apiClient.patch('/profile', data).then((r) => r.data.user),

  getStats: () =>
    apiClient.get<{ stats: ProfileStats }>('/profile/stats').then((r) => r.data.stats),
};

export const tagsApi = {
  getAll: () =>
    apiClient.get<{ tags: Array<{ id: string; name: string; isSystem: boolean }> }>('/tags').then((r) => r.data.tags),

  create: (name: string) =>
    apiClient.post<{ tag: { id: string; name: string } }>('/tags', { name }).then((r) => r.data.tag),
};