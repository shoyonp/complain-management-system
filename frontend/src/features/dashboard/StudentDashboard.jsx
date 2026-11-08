import { FilePlus2, Lock } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const firstName = profile?.name?.split(' ')[0] ?? 'there';

  return (
    <>
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="This is your student workspace. Complaint submission and tracking arrive in the next milestone."
        actions={<Badge variant="success">Account active</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="mb-1 grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            </div>
            <CardTitle>Submit a complaint</CardTitle>
            <CardDescription>
              Describe an academic, facility or administrative problem in Bangla or English.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Coming in M2: guided form, suggested category and urgency, and a tracking code you can
              save.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 grid h-9 w-9 place-items-center rounded-lg bg-success/10 text-success">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </div>
            <CardTitle>Your identity is protected</CardTitle>
            <CardDescription>
              Complaints never store your name, student ID or email in the complaint record.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Staff see only a tracking code. Identity is revealed only through an audited,
              permissioned process — and only if you choose it.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
