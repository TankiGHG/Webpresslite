import { cn } from '@/lib/utils';

/** Deterministic hue from a string, so the same person always gets the same colour. */
function hueOf(input: string): number {
  let hash = 0;
  for (const char of input) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 360;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({
  name,
  seed,
  size = 'md',
  className,
}: {
  name: string;
  /** Stable key for the colour; defaults to the name. */
  seed?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const hue = hueOf(seed ?? name);
  const dims =
    size === 'sm'
      ? 'size-7 text-[0.6875rem]'
      : size === 'lg'
        ? 'size-12 text-base'
        : 'size-9 text-xs';
  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold select-none',
        dims,
        className,
      )}
      style={{
        background: `oklch(0.9 0.06 ${hue})`,
        color: `oklch(0.38 0.14 ${hue})`,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
