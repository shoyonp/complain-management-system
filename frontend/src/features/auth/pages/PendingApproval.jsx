import { Clock, ShieldAlert, ShieldX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert } from '../../../components/ui/alert.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import { ACCOUNT_STATUS } from '../../../lib/constants.js';
import { errorMessage } from '../../../utils/errorMessage.js';
import AuthCard from '../components/AuthCard.jsx';
import { postAuthPath } from '../routing.js';

const COPY = {
  [ACCOUNT_STATUS.PENDING]: {
    icon: Clock,
    title: 'Waiting for approval',
    description:
      'Your profile is in the verification queue. An administrator compares your student ID with university records.',
    variant: 'info',
  },
  [ACCOUNT_STATUS.REJECTED]: {
    icon: ShieldX,
    title: 'Registration not approved',
    description:
      'An administrator could not verify your student details. Contact the student affairs office with your student ID.',
    variant: 'destructive',
  },
  [ACCOUNT_STATUS.SUSPENDED]: {
    icon: ShieldAlert,
    title: 'Account suspended',
    description:
      'This account cannot submit or track complaints. Contact the administrator for help.',
    variant: 'warning',
  },
};

export default function PendingApproval() {
  const { firebaseUser, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (profile?.status === ACCOUNT_STATUS.ACTIVE) {
      navigate(postAuthPath(profile, firebaseUser), { replace: true });
    }
  }, [profile, firebaseUser, navigate]);

  if (loading) {
    return null;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <Navigate to="/complete-profile" replace />;
  }

  const copy = COPY[profile.status] ?? COPY[ACCOUNT_STATUS.PENDING];
  const Icon = copy.icon;

  const checkStatus = async () => {
    setChecking(true);
    setFeedback(null);
    try {
      const next = await refreshProfile();

      if (next?.status === ACCOUNT_STATUS.ACTIVE) {
        navigate(postAuthPath(next, firebaseUser), { replace: true });
        return;
      }

      setFeedback({ variant: 'info', message: 'Still pending. Try again later.' });
    } catch (error) {
      setFeedback({ variant: 'destructive', message: errorMessage(error) });
    } finally {
      setChecking(false);
    }
  };

  return (
    <AuthCard
      title={copy.title}
      description={copy.description}
      footer={
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={async () => {
            await signOut();
            navigate('/login', { replace: true });
          }}
        >
          Sign out
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium">{profile.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {profile.studentProfile?.studentId} · {profile.studentProfile?.academicDepartment}
            </p>
            <Badge variant="secondary" className="mt-1">
              {profile.status}
            </Badge>
          </div>
        </div>

        {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

        {profile.status === ACCOUNT_STATUS.PENDING ? (
          <Button className="w-full" onClick={checkStatus} disabled={checking}>
            {checking ? 'Checking…' : 'Check status again'}
          </Button>
        ) : null}
      </div>
    </AuthCard>
  );
}
