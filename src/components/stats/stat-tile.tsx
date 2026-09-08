import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A headline number. Used instead of a one-bar chart: a single value is read
 * faster as a figure than as a mark on an axis.
 */
export function StatTile({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: string;
  delta?: { percent: number; label: string } | null;
  hint?: ReactNode;
}) {
  const direction = delta ? (delta.percent > 0 ? 'up' : delta.percent < 0 ? 'down' : 'flat') : null;
  const DeltaIcon =
    direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;

  return (
    <div className="bg-card rounded-xl border p-5 shadow-[var(--shadow-card)]">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>

      {delta ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs">
          {/* The arrow carries the direction as well as the colour, so the
              meaning does not rest on colour alone. */}
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums',
              direction === 'up' && 'bg-success-soft text-success',
              direction === 'down' && 'bg-danger-soft text-danger',
              direction === 'flat' && 'bg-muted text-muted-foreground',
            )}
          >
            <DeltaIcon className="size-3" aria-hidden />
            {Math.abs(delta.percent)} %
          </span>
          <span className="text-muted-foreground">{delta.label}</span>
        </p>
      ) : null}

      {hint ? <div className="text-muted-foreground mt-2 text-xs">{hint}</div> : null}
    </div>
  );
}
