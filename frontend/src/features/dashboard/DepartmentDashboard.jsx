import { Inbox } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card.jsx';
import { EmptyState } from '../../components/ui/empty-state.jsx';

export default function DepartmentDashboard() {
  return (
    <>
      <PageHeader
        title="Department workspace"
        description="Complaints assigned to your department will be listed here."
        actions={<Badge variant="secondary">Officer</Badge>}
      />

      <EmptyState
        icon={Inbox}
        title="No assigned complaints yet"
        description="Assignment, status updates and public replies arrive in M3. Until then this workspace stays empty."
      />

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>What you will see</CardTitle>
          <CardDescription>
            Only complaints routed to your department, never student identities.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Priority-sorted queue, status transitions, public updates and internal notes. Sensitive
          categories stay with administrators.
        </CardContent>
      </Card>
    </>
  );
}
