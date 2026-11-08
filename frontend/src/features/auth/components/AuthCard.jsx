import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card.jsx';

export default function AuthCard({ title, description, children, footer }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <Link to="/" className="mb-6 flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
        DIU Complaint Management
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer ? (
          <CardFooter className="border-t border-border pt-4 text-sm text-muted-foreground">
            {footer}
          </CardFooter>
        ) : null}
      </Card>

      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
        Your identity is never shown to handling staff unless you choose to share it.
      </p>
    </main>
  );
}
