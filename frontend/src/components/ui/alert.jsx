import { cn } from '../../lib/utils.js';

const VARIANTS = {
  info: 'border-primary/20 bg-primary/5',
  success: 'border-success/30 bg-success/10',
  warning: 'border-warning/30 bg-warning/10',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
};

const TITLE_COLORS = {
  info: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

export function Alert({ variant = 'info', title, className, children, ...props }) {
  return (
    <div
      role={variant === 'destructive' ? 'alert' : 'status'}
      className={cn('rounded-lg border p-4 text-sm', VARIANTS[variant], className)}
      {...props}
    >
      {title ? <p className={cn('font-medium', TITLE_COLORS[variant])}>{title}</p> : null}
      {children ? (
        <div className={cn(title && 'mt-1', 'text-foreground/80')}>{children}</div>
      ) : null}
    </div>
  );
}
