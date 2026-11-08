import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function Spinner({ className, label = 'Loading' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Loader2
        className={cn('h-4 w-4 animate-spin text-muted-foreground', className)}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageLoader({ label = 'Loading…' }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm text-muted-foreground" role="status">
          {label}
        </p>
      </div>
    </div>
  );
}
