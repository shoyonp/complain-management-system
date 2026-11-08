import { zodResolver } from '@hookform/resolvers/zod';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '../../../components/ui/alert.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { auth } from '../../../lib/firebase.js';
import { firebaseErrorMessage } from '../../../lib/firebase-errors.js';
import AuthCard from '../components/AuthCard.jsx';

const schema = z.object({
  email: z.email({ error: 'Enter a valid email address' }),
});

export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = async ({ email }) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setSentTo(email);
    } catch (error) {
      setError('root', { message: firebaseErrorMessage(error) });
    }
  };

  return (
    <AuthCard
      title="Reset your password"
      description="We will email you a secure link to choose a new password."
      footer={
        <span>
          Remembered it?{' '}
          <Link className="font-medium text-primary hover:underline" to="/login">
            Back to sign in
          </Link>
        </span>
      }
    >
      {sentTo ? (
        <Alert variant="success" title="Check your inbox">
          A reset link was sent to <span className="font-medium">{sentTo}</span>. It expires after
          one hour.
        </Alert>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
          {errors.root ? <Alert variant="destructive">{errors.root.message}</Alert> : null}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
