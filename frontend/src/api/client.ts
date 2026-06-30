import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attacher le JWT automatiquement à chaque requête
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('matedex_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gérer les erreurs 401 globalement (token expiré)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('matedex_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;