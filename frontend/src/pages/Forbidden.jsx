import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { postAuthPath } from '../features/auth/routing.js';

export default function Forbidden() {
  const { firebaseUser, profile } = useAuth();
  const home = firebaseUser ? postAuthPath(profile, firebaseUser) : '/login';

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <ShieldX className="h-6 w-6" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">403</p>
        <h1 className="mt-1 text-2xl font-semibold">You do not have access to this page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This area belongs to a different role. If you believe this is a mistake, contact the
          administrator.
        </p>
        <Button asChild className="mt-6">
          <Link to={home}>Go back</Link>
        </Button>
      </div>
    </main>
  );
}
