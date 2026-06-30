import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import AddPlanPage from './pages/AddPlanPage';
import MyPlansPage from './pages/MyPlansPage';
import PlanDetailPage from './pages/PlanDetailPage';
import ProfilePage from './pages/ProfilePage';
import AppLayout from './components/AppLayout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center text-primary text-headline-md">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/oauth-callback" element={<OAuthCallbackPage />} />

      {/* Routes privées avec layout (bottom nav) */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="plans" element={<MyPlansPage />} />
        <Route path="plans/:id" element={<PlanDetailPage />} />
        <Route path="plans/new" element={<AddPlanPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}