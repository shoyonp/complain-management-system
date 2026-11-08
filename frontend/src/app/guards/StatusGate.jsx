import { Navigate, Outlet } from 'react-router-dom';
import { FullPageLoader } from '../../components/ui/spinner.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { ACCOUNT_STATUS } from '../../lib/constants.js';

// Email verified -> profile complete -> account active (blueprint §7.6).
export default function StatusGate() {
  const { firebaseUser, profile, loading } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!firebaseUser.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!profile) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (profile.status !== ACCOUNT_STATUS.ACTIVE) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <Outlet />;
}
