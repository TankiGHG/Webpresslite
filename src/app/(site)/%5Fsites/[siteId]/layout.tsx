import { Search } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { getPublicSite, listAllPublished } from '@/lib/db/queries/public-sites';
import { getEnv } from '@/lib/env';
import { resolveTheme } from '@/lib/themes/definitions';
import { parseThemeSettings, themeStyle } from '@/lib/themes/settings';

export default async function SiteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await params;
  const [site, published] = await Promise.all([getPublicSite(siteId), listAllPublished(siteId)]);

  if (!site) notFound();

  const theme = resolveTheme(site.theme);
  const settings = parseThemeSettings(site.themeSettings);
  const style = themeStyle(site.theme, settings) as CSSProperties;
  // Pages double as the menu; the newest four keep the header tidy.
  const pages = published.filter((entry) => entry.type === 'page').slice(0, 4);
  const year = new Date().getFullYear();

  return (
    <div className="site-root" data-theme={theme.id} data-layout={theme.layout} style={style}>
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
            {pages.map((page) => (
              <Link key={page.id} href={`/${page.slug}`}>
                {page.title}
              </Link>
            ))}
            <Link href="/archiv">Archiv</Link>
            <Link href="/suche" className="site-search-link" aria-label="Suche">
              <Search aria-hidden />
              <span className="sr-only sm:not-sr-only">Suche</span>
            </Link>
          </nav>
        </div>
      </header>

      <main id="content" className="site-container site-main">
        {children}
      </main>

      <footer className="site-footer">
        <div className="site-container">
          <p>
            © {year} {site.name}
          </p>
          <nav className="site-footer-links" aria-label="Fußzeile">
            <Link href="/archiv">Archiv</Link>
            <Link href="/feed.xml">RSS</Link>
            <Link href="/suche">Suche</Link>
          </nav>
          <p className="site-powered">
            Erstellt mit{' '}
            <a href={getEnv().APP_URL} rel="noopener">
              webpresslite
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
