import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Alert } from '../../../components/ui/alert.jsx';
import { Button } from '../../../components/ui/button.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import api from '../../../lib/axios.js';
import { errorMessage } from '../../../utils/errorMessage.js';
import AuthCard from '../components/AuthCard.jsx';
import { postAuthPath } from '../routing.js';

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: 'Enter your full name' })
    .max(120, { error: 'Name is too long' }),
  studentId: z
    .string()
    .trim()
    .min(3, { error: 'Enter your student ID' })
    .max(30, { error: 'Student ID is too long' })
    .regex(/^[A-Za-z0-9-]+$/, { error: 'Use letters, numbers and dashes only' }),
  academicDepartment: z
    .string()
    .trim()
    .min(2, { error: 'Enter your academic department' })
    .max(120, { error: 'Department name is too long' }),
  batch: z.string().trim().min(1, { error: 'Enter your batch' }).max(40),
  semester: z.string().trim().min(1, { error: 'Enter your semester' }).max(40),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{6,30}$/, { error: 'Enter a valid phone number' })
    .or(z.literal(''))
    .optional(),
});

export default function CompleteProfile() {
  const { firebaseUser, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [details, setDetails] = useState([]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: firebaseUser?.displayName ?? '',
      studentId: '',
      academicDepartment: '',
      batch: '',
      semester: '',
      phone: '',
    },
  });

  if (loading) {
    return null;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (!firebaseUser.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (profile) {
    return <Navigate to={postAuthPath(profile, firebaseUser)} replace />;
  }

  const onSubmit = async (values) => {
    setDetails([]);

    const payload = { ...values };
    if (!payload.phone) {
      delete payload.phone;
    }

    try {
      await api.post('/auth/register-profile', payload);
      await refreshProfile();
      navigate('/pending-approval', { replace: true });
    } catch (error) {
      const apiDetails = error?.response?.data?.error?.details ?? [];
      setDetails(apiDetails);
      setError('root', { message: errorMessage(error) });
    }
  };

  return (
    <AuthCard
      title="Complete your student profile"
      description="An administrator compares this with university records before activating your account."
      footer={<span>Student ID and email are never attached to your complaints.</span>}
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        {errors.root ? (
          <Alert variant="destructive" title="Could not save your profile">
            <p>{errors.root.message}</p>
            {details.length > 0 ? (
              <ul className="mt-2 list-inside list-disc text-xs">
                {details.map((detail) => (
                  <li key={detail.path}>{detail.message}</li>
                ))}
              </ul>
            ) : null}
          </Alert>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="studentId">Student ID</Label>
          <Input
            id="studentId"
            placeholder="DIU-2026-001"
            aria-invalid={Boolean(errors.studentId)}
            {...register('studentId')}
          />
          {errors.studentId ? (
            <p className="text-xs text-destructive">{errors.studentId.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="academicDepartment">Academic department</Label>
          <Input
            id="academicDepartment"
            placeholder="Computer Science and Engineering"
            aria-invalid={Boolean(errors.academicDepartment)}
            {...register('academicDepartment')}
          />
          {errors.academicDepartment ? (
            <p className="text-xs text-destructive">{errors.academicDepartment.message}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="batch">Batch</Label>
            <Input
              id="batch"
              placeholder="52"
              aria-invalid={Boolean(errors.batch)}
              {...register('batch')}
            />
            {errors.batch ? (
              <p className="text-xs text-destructive">{errors.batch.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="semester">Semester</Label>
            <Input
              id="semester"
              placeholder="8"
              aria-invalid={Boolean(errors.semester)}
              {...register('semester')}
            />
            {errors.semester ? (
              <p className="text-xs text-destructive">{errors.semester.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+8801700000000"
            aria-invalid={Boolean(errors.phone)}
            {...register('phone')}
          />
          {errors.phone ? <p className="text-xs text-destructive">{errors.phone.message}</p> : null}
        </div>

        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Submit for verification'}
        </Button>
      </form>
    </AuthCard>
  );
}
