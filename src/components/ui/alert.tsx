import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps extends ComponentProps<'div'> {
  variant?: 'error' | 'success' | 'info' | 'warning';
}

const STYLES = {
  error: { icon: XCircle, className: 'border-danger/30 bg-danger-soft text-danger' },
  success: { icon: CheckCircle2, className: 'border-success/30 bg-success-soft text-success' },
  warning: { icon: AlertTriangle, className: 'border-warning/40 bg-warning-soft text-warning' },
  info: {
    icon: Info,
    className: 'border-primary/30 bg-primary-soft text-primary-soft-foreground',
  },
} as const;

export function Alert({ className, variant = 'error', children, ...props }: AlertProps) {
  const { icon: Icon, className: tone } = STYLES[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm',
        'animate-fade-in',
        tone,
        className,
      )}
      {...props}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
