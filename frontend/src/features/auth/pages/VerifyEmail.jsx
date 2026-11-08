import { sendEmailVerification } from 'firebase/auth';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Alert } from '../../../components/ui/alert.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import { auth } from '../../../lib/firebase.js';
import { firebaseErrorMessage } from '../../../lib/firebase-errors.js';
import AuthCard from '../components/AuthCard.jsx';
import { postAuthPath } from '../routing.js';

export default function VerifyEmail() {
  const { firebaseUser, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return null;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (firebaseUser.emailVerified && profile) {
    return <Navigate to={postAuthPath(profile, firebaseUser)} replace />;
  }

  const resend = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await sendEmailVerification(firebaseUser);
      setFeedback({
        variant: 'success',
        message: 'Verification email sent. Check your inbox and spam folder.',
      });
    } catch (error) {
      setFeedback({ variant: 'destructive', message: firebaseErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const checkAgain = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await firebaseUser.reload();
      const currentUser = auth.currentUser;

      if (!currentUser?.emailVerified) {
        setFeedback({
          variant: 'warning',
          message: 'Still not verified. Open the link in your email first.',
        });
        return;
      }

      const nextProfile = await refreshProfile().catch(() => null);
      navigate(postAuthPath(nextProfile, currentUser), { replace: true });
    } catch (error) {
      setFeedback({ variant: 'destructive', message: firebaseErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Verify your email"
      description={`We sent a verification link to ${firebaseUser.email}.`}
      footer={
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={async () => {
            await signOut();
            navigate('/login', { replace: true });
          }}
        >
          Use a different account
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 p-4">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Email verification keeps fake accounts out. Open the link in the email, then come back
            here and continue.
          </p>
        </div>

        {feedback ? <Alert variant={feedback.variant}>{feedback.message}</Alert> : null}

        <Button className="w-full" onClick={checkAgain} disabled={busy}>
          {busy ? 'Checking…' : 'I have verified my email'}
        </Button>
        <Button className="w-full" variant="outline" onClick={resend} disabled={busy}>
          Resend verification email
        </Button>
      </div>
    </AuthCard>
  );
}
