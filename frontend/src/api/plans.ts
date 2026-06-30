import apiClient from './client';

export interface Plan {
  id: string;
  partnerName: string;
  partnerAge?: number;
  bananaSize?: 'S' | 'M' | 'L' | 'XL';
  latitude?: number;
  longitude?: number;
  locationName?: string;
  description?: string;
  score?: number;
  planDate: string;
  category: 'plage' | 'soiree' | 'festival' | 'autre';
  tags: Array<{ tag: { id: string; name: string } }>;
  photos: Array<{ id: string; filePath: string; isNsfw: boolean; mimeType: string }>;
}

export interface CreatePlanPayload {
  partnerName: string;
  partnerAge?: number;
  bananaSize?: 'S' | 'M' | 'L' | 'XL';
  latitude?: number;
  longitude?: number;
  locationName?: string;
  description?: string;
  score?: number;
  planDate?: string;
  category?: Plan['category'];
  tagIds?: string[];
}

export const plansApi = {
  getAll: (category?: string) =>
    apiClient.get<{ plans: Plan[] }>('/plans', { params: category ? { category } : {} }).then((r) => r.data.plans),

  getById: (id: string) =>
    apiClient.get<{ plan: Plan }>(`/plans/${id}`).then((r) => r.data.plan),

  create: (data: CreatePlanPayload) =>
    apiClient.post<{ plan: Plan }>('/plans', data).then((r) => r.data.plan),

  update: (id: string, data: Partial<CreatePlanPayload>) =>
    apiClient.patch<{ plan: Plan }>(`/plans/${id}`, data).then((r) => r.data.plan),

  delete: (id: string) =>
    apiClient.delete(`/plans/${id}`),
};