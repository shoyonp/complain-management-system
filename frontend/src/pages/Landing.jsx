import { ArrowRight, FileSearch, Lock, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { postAuthPath } from '../features/auth/routing.js';

const FEATURES = [
  {
    icon: Lock,
    title: 'Protected by default',
    body: 'Complaints never store your name, student ID or email. Staff see a tracking code, not you.',
  },
  {
    icon: FileSearch,
    title: 'Human triage',
    body: 'Administrators confirm the category, priority and department, so every complaint reaches the right office.',
  },
  {
    icon: Users,
    title: 'Track every step',
    body: 'Follow the timeline from submission to resolution, with public updates from the handling department.',
  },
];

export default function Landing() {
  const { firebaseUser, profile, loading } = useAuth();
  const signedIn = !loading && Boolean(firebaseUser);

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            DIU Complaints
          </Link>
          <nav className="flex items-center gap-2" aria-label="Account">
            {signedIn ? (
              <Button asChild size="sm">
                <Link to={postAuthPath(profile, firebaseUser)}>
                  Go to dashboard
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/register">Create account</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              Dhaka International University · Pilot
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Report campus problems without revealing who you are.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Submit academic, facility or administrative complaints in Bangla or English. Track
              progress with a code only you and the handling office can follow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={signedIn ? postAuthPath(profile, firebaseUser) : '/register'}>
                  {signedIn ? 'Open dashboard' : 'Submit a complaint'}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login">Staff sign in</Link>
              </Button>
            </div>
          </div>

          <ul className="mt-16 grid gap-4 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="text-base font-semibold">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto w-full max-w-6xl px-4 text-xs text-muted-foreground sm:px-6">
          <p>Dhaka International University · Complaint Management System</p>
          <p className="mt-1">
            Demo system. Student identity is stored separately from complaints.
          </p>
        </div>
      </footer>
    </div>
  );
}
