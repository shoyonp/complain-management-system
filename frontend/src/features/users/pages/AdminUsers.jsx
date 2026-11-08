import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, RefreshCw, Search, ShieldQuestion, X } from 'lucide-react';
import { useState } from 'react';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import { Alert } from '../../../components/ui/alert.jsx';
import { Badge } from '../../../components/ui/badge.jsx';
import { Button } from '../../../components/ui/button.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog.jsx';
import { EmptyState } from '../../../components/ui/empty-state.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Label } from '../../../components/ui/label.jsx';
import { Spinner } from '../../../components/ui/spinner.jsx';
import { useDebounce } from '../../../hooks/useDebounce.js';
import api from '../../../lib/axios.js';
import { errorMessage } from '../../../utils/errorMessage.js';

const PAGE_SIZE = 10;

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_VARIANT = {
  pending: 'warning',
  active: 'success',
  rejected: 'destructive',
  suspended: 'outline',
};

const formatDate = (value) =>
  value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState(null);

  const debouncedSearch = useDebounce(search);
  const params = {
    status,
    page,
    limit: PAGE_SIZE,
    ...(debouncedSearch.trim() ? { q: debouncedSearch.trim() } : {}),
  };

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => {
      const response = await api.get('/admin/users', { params });
      return response.data;
    },
    placeholderData: (previous) => previous,
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, decision, rejectionNote }) => {
      const response = await api.patch(`/admin/users/${id}/verify`, {
        decision,
        ...(rejectionNote ? { note: rejectionNote } : {}),
      });
      return response.data.data;
    },
    onSuccess: () => {
      setActionError(null);
      setRejectTarget(null);
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (mutationError) => setActionError(errorMessage(mutationError)),
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  const changeStatus = (value) => {
    setStatus(value);
    setPage(1);
  };

  const confirmReject = () => {
    if (!rejectTarget) {
      return;
    }

    verifyMutation.mutate({
      id: rejectTarget.id,
      decision: 'reject',
      rejectionNote: note.trim() || undefined,
    });
  };

  const actionsFor = (user) =>
    user.status === 'pending' ? (
      <div className="flex items-center justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => verifyMutation.mutate({ id: user.id, decision: 'approve' })}
          disabled={verifyMutation.isPending}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => {
            setActionError(null);
            setNote('');
            setRejectTarget(user);
          }}
          disabled={verifyMutation.isPending}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          Reject
        </Button>
      </div>
    ) : (
      <span className="text-xs text-muted-foreground">
        {user.verifiedAt ? `Verified ${formatDate(user.verifiedAt)}` : '—'}
      </span>
    );

  return (
    <>
      <PageHeader
        title="Student verification"
        description="Check the student ID against university records before approving an account. Rejections can include a short note."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw
              className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
              aria-hidden="true"
            />
            Refresh
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by account status">
          {TABS.map((tab) => (
            <Button
              key={tab.value}
              size="sm"
              variant={status === tab.value ? 'default' : 'outline'}
              aria-pressed={status === tab.value}
              onClick={() => changeStatus(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Label htmlFor="user-search" className="sr-only">
            Search users
          </Label>
          <Input
            id="user-search"
            className="pl-9"
            placeholder="Search name, email or student ID"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {actionError ? (
        <Alert variant="destructive" className="mb-4" title="Action failed">
          {actionError}
        </Alert>
      ) : null}

      {isPending ? (
        <div className="flex items-center justify-center rounded-xl border border-border bg-card py-16">
          <Spinner label="Loading users" />
        </div>
      ) : isError ? (
        <Alert variant="destructive" title="Could not load users">
          <p>{errorMessage(error)}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
            Try again
          </Button>
        </Alert>
      ) : users.length === 0 ? (
        <EmptyState
          icon={ShieldQuestion}
          title={status === 'pending' ? 'No pending registrations' : 'Nothing here'}
          description={
            status === 'pending'
              ? 'New student registrations will appear here for verification.'
              : 'No accounts match this filter and search.'
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Student accounts awaiting verification</caption>
              <thead className="bg-muted/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Student
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Student ID
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Registered
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="align-middle">
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {user.studentProfile?.studentId ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[user.status] ?? 'outline'}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">{actionsFor(user)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {users.map((user) => (
              <li key={user.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[user.status] ?? 'outline'}>{user.status}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Student ID</dt>
                    <dd className="font-mono">{user.studentProfile?.studentId ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Registered</dt>
                    <dd>{formatDate(user.createdAt)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex justify-end">{actionsFor(user)}</div>
              </li>
            ))}
          </ul>

          {meta ? (
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>
                Page {meta.page} of {Math.max(meta.totalPages, 1)} · {meta.total} account
                {meta.total === 1 ? '' : 's'}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.page <= 1}
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject registration</DialogTitle>
            <DialogDescription>
              {rejectTarget
                ? `${rejectTarget.name} will be told the registration was not approved. The note is for staff records.`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="rejection-note">Note (optional)</Label>
            <textarea
              id="rejection-note"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="e.g. Student ID does not match university records."
            />
            <p className="text-xs text-muted-foreground">{note.length}/500</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending ? 'Rejecting…' : 'Reject registration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
