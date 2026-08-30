import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps extends ComponentProps<'div'> {
  variant?: 'error' | 'success';
}

export function Alert({ className, variant = 'error', ...props }: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-md border px-3 py-2 text-sm',
        variant === 'error'
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-green-200 bg-green-50 text-green-900',
        className,
      )}
      {...props}
    />
  );
}
