import type { ReactNode } from 'react';

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-[var(--color-muted-foreground)]">{description}</p>
        ) : null}
      </header>
      {children}
      {footer ? (
        <footer className="text-sm text-[var(--color-muted-foreground)]">{footer}</footer>
      ) : null}
    </div>
  );
}
