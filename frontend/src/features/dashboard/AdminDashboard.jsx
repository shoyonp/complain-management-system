import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Button } from '../../components/ui/button.jsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card.jsx';
import { Spinner } from '../../components/ui/spinner.jsx';
import api from '../../lib/axios.js';

export default function AdminDashboard() {
  const { data, isPending } = useQuery({
    queryKey: ['admin', 'users', 'pending-count'],
    queryFn: async () => {
      const response = await api.get('/admin/users', { params: { status: 'pending', limit: 1 } });
      return response.data;
    },
  });

  const pendingCount = data?.meta?.total;

  return (
    <>
      <PageHeader
        title="Administrator dashboard"
        description="Verification queue is live. Triage, analytics and user management follow in later milestones."
        actions={<Badge variant="default">Administrator</Badge>}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="mb-1 grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <UserCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <CardTitle>Student verification</CardTitle>
            <CardDescription>
              Approve or reject pending student registrations after checking their student ID.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {isPending ? (
                <Spinner label="Loading pending count" />
              ) : (
                <p className="text-sm text-muted-foreground">
                  <span className="text-2xl font-semibold text-foreground">
                    {pendingCount ?? 0}
                  </span>{' '}
                  awaiting approval
                </p>
              )}
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/users">
                Open queue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 grid h-9 w-9 place-items-center rounded-lg bg-success/10 text-success">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </div>
            <CardTitle>Privacy guardrails</CardTitle>
            <CardDescription>Roles come from MongoDB, not from tokens.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Identity reveal, audit logs and analytics require their own permissions and arrive in M4
            and M5.
          </CardContent>
        </Card>
      </div>
    </>
  );
}
