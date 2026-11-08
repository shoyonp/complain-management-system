import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

// Role check is a usability gate; the API enforces the same rule server-side.
export default function RoleRoute({ roles }) {
  const { profile } = useAuth();

  if (!profile || !roles.includes(profile.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
