import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A native checkbox wearing a switch. No JavaScript and no extra dependency:
 * it posts with the surrounding form like any other field, and `role="switch"`
 * makes a screen reader announce "on"/"off" rather than "checked".
 *
 * Like every checkbox, an unchecked one sends nothing — whoever reads the form
 * has to treat a missing value as off.
 */
export function Switch({
  label,
  hint,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3', className)}>
      <input type="checkbox" role="switch" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className={cn(
          'bg-input mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
          'peer-checked:bg-primary',
          'peer-focus-visible:ring-ring peer-focus-visible:ring-[3px]',
          'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
          // The knob is a grandchild of the input, so `peer-checked` alone
          // would not reach it — the sibling combinator stops at this span.
          'peer-checked:[&>span]:translate-x-4',
        )}
      >
        <span className="bg-card size-4 rounded-full shadow-xs transition-transform" />
      </span>
      <span className="peer-disabled:opacity-50">
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="text-muted-foreground mt-0.5 block text-xs">{hint}</span> : null}
      </span>
    </label>
  );
}
