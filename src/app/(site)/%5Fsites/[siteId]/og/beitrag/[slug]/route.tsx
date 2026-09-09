import { ImageResponse } from 'next/og';
import { getPublicSite, getPublishedPost } from '@/lib/db/queries/public-sites';
import { resolveTheme, type ThemeId } from '@/lib/themes/definitions';
import { parseThemeSettings } from '@/lib/themes/settings';

/**
 * OG image at a stable, public path.
 *
 * Next's file-based `opengraph-image` would work too, but it derives the URL
 * from the internal rewrite target — crawlers would be pointed at
 * `/_sites/<id>/...` on the wrong host. A plain route handler keeps the URL
 * ours to choose.
 */
// A route handler may only export request methods, so the dimensions are a
// plain module constant rather than the `size` export a metadata file uses.
const SIZE = { width: 1200, height: 630 };

/** Satori does not understand oklch, so the card carries its own palette. */
const CARDS: Record<ThemeId, { background: string; foreground: string; accent: string }> = {
  minimal: { background: '#ffffff', foreground: '#1a1a1a', accent: '#2563eb' },
  journal: { background: '#fdfaf3', foreground: '#2b241c', accent: '#a8431f' },
  editorial: { background: '#fbfaf7', foreground: '#1f1a16', accent: '#c0392b' },
  ocean: { background: '#f4f8fb', foreground: '#1b2a3a', accent: '#1f6f8b' },
  contrast: { background: '#14161f', foreground: '#f5f6fa', accent: '#e8b931' },
  atelier: { background: '#fdfcfa', foreground: '#2a2723', accent: '#0f6a53' },
  neo: { background: '#f8f0dd', foreground: '#1a1a1a', accent: '#4f3ae0' },
  aurora: { background: '#121324', foreground: '#f0f1f8', accent: '#c07de8' },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteId: string; slug: string }> },
) {
  const { siteId, slug } = await params;
  const [site, post] = await Promise.all([getPublicSite(siteId), getPublishedPost(siteId, slug)]);

  if (!site || !post) return new Response('Not found', { status: 404 });

  const theme = resolveTheme(site.theme);
  const card = CARDS[theme.id];
  const settings = parseThemeSettings(site.themeSettings);
  const accent = settings.accent ?? card.accent;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: card.background,
        color: card.foreground,
        padding: '72px',
        fontFamily: theme.tokens.bodyFont === 'serif' ? 'serif' : 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', height: 10, width: 160, background: accent }} />

      <div
        style={{
          display: 'flex',
          fontSize: post.title.length > 60 ? 56 : 72,
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}
      >
        {post.title}
      </div>

      <div style={{ display: 'flex', fontSize: 30, color: accent }}>{site.name}</div>
    </div>,
    {
      ...SIZE,
      headers: {
        'cache-control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
