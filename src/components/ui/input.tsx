import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none',
        'placeholder:text-[var(--color-muted-foreground)]',
        'focus-visible:ring-[3px] focus-visible:ring-[var(--color-ring)]',
        'aria-invalid:border-red-600 aria-invalid:ring-red-600/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
