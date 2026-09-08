import Link from 'next/link';
import { useId } from 'react';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  // The mark appears more than once per page (sidebar, mobile header). A
  // shared gradient id would resolve to the first copy, and if that one is
  // display:none the fill silently vanishes.
  const gradientId = `wpl-logo-${useId().replace(/\W/g, '')}`;

  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden
      className={cn('size-7 shrink-0', className)}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${gradientId})`} />
      <path
        d="M7 10.5h3.1l2 8.2 2.2-8.2h2.9l2.2 8.2 2-8.2H25l-3.6 12h-3.4l-2-7.4-2 7.4h-3.4z"
        fill="#fff"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('text-[0.9375rem] font-semibold tracking-tight', className)}>
      webpress<span className="text-primary">lite</span>
    </span>
  );
}

export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        'focus-visible:ring-ring inline-flex items-center gap-2 rounded-md outline-none focus-visible:ring-[3px]',
        className,
      )}
      aria-label="webpresslite"
    >
      <LogoMark />
      <Wordmark />
    </Link>
  );
}
