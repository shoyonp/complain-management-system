import { ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { ROLE_LABELS } from '../../lib/constants.js';
import { NAV_BY_ROLE } from '../../lib/navigation.js';
import { cn } from '../../lib/utils.js';
import { Badge } from '../ui/badge.jsx';

export default function Sidebar({ className, onNavigate }) {
  const { profile } = useAuth();
  const items = NAV_BY_ROLE[profile?.role] ?? [];

  return (
    <aside className={cn('flex w-64 shrink-0 flex-col border-r border-border bg-card', className)}>
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold">DIU Complaints</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main navigation">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">Signed in as</p>
        <p className="truncate text-sm font-medium">{profile?.name}</p>
        <Badge variant="secondary" className="mt-2">
          {ROLE_LABELS[profile?.role] ?? 'User'}
        </Badge>
      </div>
    </aside>
  );
}
