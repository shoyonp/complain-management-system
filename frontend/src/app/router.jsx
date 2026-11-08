import { Route, Routes } from 'react-router-dom';
import AppShell from '../components/layout/AppShell.jsx';
import { ROLES } from '../lib/constants.js';
import AdminDashboard from '../features/dashboard/AdminDashboard.jsx';
import DepartmentDashboard from '../features/dashboard/DepartmentDashboard.jsx';
import StudentDashboard from '../features/dashboard/StudentDashboard.jsx';
import CompleteProfile from '../features/auth/pages/CompleteProfile.jsx';
import ForgotPassword from '../features/auth/pages/ForgotPassword.jsx';
import Login from '../features/auth/pages/Login.jsx';
import PendingApproval from '../features/auth/pages/PendingApproval.jsx';
import Register from '../features/auth/pages/Register.jsx';
import VerifyEmail from '../features/auth/pages/VerifyEmail.jsx';
import AdminUsers from '../features/users/pages/AdminUsers.jsx';
import Forbidden from '../pages/Forbidden.jsx';
import Landing from '../pages/Landing.jsx';
import NotFound from '../pages/NotFound.jsx';
import ProtectedRoute from './guards/ProtectedRoute.jsx';
import RoleRoute from './guards/RoleRoute.jsx';
import StatusGate from './guards/StatusGate.jsx';

export default function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/403" element={<Forbidden />} />

      {/* Signed in, onboarding screens (outside StatusGate to avoid loops) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/pending-approval" element={<PendingApproval />} />

        {/* Signed in, verified, profiled and active */}
        <Route element={<StatusGate />}>
          <Route element={<AppShell />}>
            <Route path="/student" element={<RoleRoute roles={[ROLES.STUDENT]} />}>
              <Route index element={<StudentDashboard />} />
            </Route>

            <Route path="/department" element={<RoleRoute roles={[ROLES.DEPARTMENT]} />}>
              <Route index element={<DepartmentDashboard />} />
            </Route>

            <Route path="/admin" element={<RoleRoute roles={[ROLES.ADMIN]} />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
