import type { ReactNode } from 'react';

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

  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>

      {delta ? (
        <p className="mt-1 text-xs">
          {/* The arrow carries the direction as well as the colour, so the
              meaning does not rest on colour alone. */}
          <span
            className={
              direction === 'up'
                ? 'text-green-700'
                : direction === 'down'
                  ? 'text-red-700'
                  : 'text-[var(--color-muted-foreground)]'
            }
          >
            {direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'} {Math.abs(delta.percent)}%
          </span>{' '}
          <span className="text-[var(--color-muted-foreground)]">{delta.label}</span>
        </p>
      ) : null}

      {hint ? (
        <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{hint}</div>
      ) : null}
    </div>
  );
}
