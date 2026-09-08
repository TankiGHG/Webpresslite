import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'border-input bg-card flex min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[border-color,box-shadow] outline-none',
        'placeholder:text-muted-foreground',
        'focus-visible:border-primary focus-visible:ring-ring focus-visible:ring-[3px]',
        'aria-invalid:border-danger aria-invalid:ring-danger/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
