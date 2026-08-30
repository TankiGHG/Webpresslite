import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getPublicSite } from '@/lib/db/queries/public-sites';
import { parseThemeSettings, themeStyle } from '@/lib/themes/settings';
import type { CSSProperties } from 'react';

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const site = await getPublicSite(siteId);

  if (!site) notFound();

  const settings = parseThemeSettings(site.themeSettings);
  const style = themeStyle(site.theme, settings) as CSSProperties;

  return (
    <div className="site-root" data-theme={site.theme} style={style}>
      <a href="#content" className="site-skip-link">
        Zum Inhalt springen
      </a>

      <header className="site-header">
        <div className="site-container">
          <Link href="/" className="site-brand" data-testid="site-name">
            {settings.logoUrl ? (
              // A remote logo of unknown dimensions; `next/image` would need a
              // configured host per site, which tenants cannot provide.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt={settings.logoAlt ?? site.name}
                className="site-logo"
                height={40}
              />
            ) : (
              site.name
            )}
          </Link>

          <nav aria-label="Hauptnavigation" className="site-nav">
            <Link href="/">Start</Link>
            <Link href="/archiv">Archiv</Link>
          </nav>
        </div>
      </header>

      <main id="content" className="site-container site-main">
        {children}
      </main>

      <footer className="site-footer">
        <div className="site-container">
          <p>
            {site.name} · <Link href="/feed.xml">RSS</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
