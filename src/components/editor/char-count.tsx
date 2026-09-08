'use client';

import { useState, type ComponentProps } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Shared = {
  label: string;
  name: string;
  max: number;
  hint?: string;
  error?: string;
  defaultValue?: string;
  disabled?: boolean;
};

/** Field with a live character counter; turns red past `max`. */
export function CountedField({
  label,
  name,
  max,
  hint,
  error,
  defaultValue = '',
  disabled,
  multiline = false,
  ...props
}: Shared & { multiline?: boolean } & Omit<ComponentProps<'input'>, keyof Shared>) {
  const [length, setLength] = useState(defaultValue.length);
  const over = length > max;
  const describedBy = [error ? `${name}-error` : null, hint ? `${name}-hint` : null]
    .filter(Boolean)
    .join(' ');

  const shared = {
    id: name,
    name,
    defaultValue,
    disabled,
    'aria-invalid': error || over ? true : undefined,
    'aria-describedby': describedBy || undefined,
    onChange: (event: { target: { value: string } }) => setLength(event.target.value.length),
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={name}>{label}</Label>
        <span
          className={cn(
            'text-[0.6875rem] tabular-nums',
            over ? 'text-danger' : 'text-muted-foreground',
          )}
          aria-live="polite"
        >
          {length}/{max}
        </span>
      </div>
      {multiline ? <Textarea rows={3} {...shared} /> : <Input {...shared} {...props} />}
      {hint ? (
        <p id={`${name}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} className="text-danger text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
