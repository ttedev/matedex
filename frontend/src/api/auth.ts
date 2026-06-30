import apiClient from './client';

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: { id: string; email: string; displayName: string; avatarUrl: string | null; title: string };
  token: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  getMe: () =>
    apiClient.get<{ user: AuthResponse['user'] }>('/auth/me').then((r) => r.data),
};