import { LayoutDashboard, Users } from 'lucide-react';

// Role-based menu defined once (blueprint §4.4). Only routes that exist in the
// current milestone are listed, so no link ever leads to a dead page.
export const NAV_BY_ROLE = {
  student: [{ label: 'Dashboard', to: '/student', icon: LayoutDashboard }],
  department: [{ label: 'Dashboard', to: '/department', icon: LayoutDashboard }],
  admin: [
    { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
    { label: 'Users', to: '/admin/users', icon: Users },
  ],
};
