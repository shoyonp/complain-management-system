import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FullPageLoader } from '../../components/ui/spinner.jsx';
import { useAuth } from '../../hooks/useAuth.js';

// Signed-in only. Onboarding screens (verify email, complete profile, pending
// approval) sit behind this guard but outside StatusGate.
export default function ProtectedRoute() {
  const { firebaseUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
