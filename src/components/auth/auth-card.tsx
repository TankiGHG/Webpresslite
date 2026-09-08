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
    <div className="space-y-8">
      <header className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </header>
      {children}
      {footer ? (
        <footer className="text-muted-foreground [&_a]:text-foreground border-t pt-6 text-sm [&_a]:font-medium [&_a]:underline-offset-4 hover:[&_a]:underline">
          {footer}
        </footer>
      ) : null}
    </div>
  );
}
