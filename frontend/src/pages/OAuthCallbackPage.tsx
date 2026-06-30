import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      navigate('/login?error=oauth_failed');
      return;
    }

    // Stocker le token puis récupérer le profil
    localStorage.setItem('matedex_token', token);
    authApi
      .getMe()
      .then((data) => {
        login(token, data.user);
        navigate('/');
      })
      .catch(() => navigate('/login?error=oauth_failed'));
  }, [login, navigate, params]);

  return (
    <div className="flex h-screen items-center justify-center bg-surface">
      <p className="text-body-lg text-on-surface">Connexion en cours...</p>
    </div>
  );
}