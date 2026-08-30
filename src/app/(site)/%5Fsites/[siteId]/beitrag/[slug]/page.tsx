import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { RenderedContent } from '@/components/editor/rendered-content';
import { getPublicSite, getPublishedPost } from '@/lib/db/queries/public-sites';
import { getEnv } from '@/lib/env';
import { siteUrl } from '@/lib/tenant/host';

type Params = Promise<{ siteId: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { siteId, slug } = await params;
  const [site, post] = await Promise.all([getPublicSite(siteId), getPublishedPost(siteId, slug)]);

  if (!site || !post) return { title: 'Nicht gefunden', robots: { index: false } };

  const base = siteUrl(site.subdomain, getEnv().ROOT_DOMAIN);
  const url = `${base}/beitrag/${post.slug}`;
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt ?? undefined;
  const image = `${base}/og/beitrag/${post.slug}`;

  return {
    title,
    description,
    metadataBase: new URL(base),
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: site.name,
      locale: 'de_DE',
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function PublicPostPage({ params }: { params: Params }) {
  const { siteId, slug } = await params;
  const [site, post] = await Promise.all([getPublicSite(siteId), getPublishedPost(siteId, slug)]);

  if (!site || !post) notFound();

  const base = siteUrl(site.subdomain, getEnv().ROOT_DOMAIN);

  // Structured data lets search engines read the article without guessing.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: `${base}/beitrag/${post.slug}`,
    publisher: { '@type': 'Organization', name: site.name },
  };

  return (
    <article>
      <script
        type="application/ld+json"
        // Serialised from our own data, not from user supplied markup.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <header className="post-header">
        <h1 data-testid="post-title">{post.title}</h1>
        {post.publishedAt ? (
          <p className="post-meta">
            <time dateTime={post.publishedAt.toISOString()}>
              {post.publishedAt.toLocaleDateString('de-DE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </p>
        ) : null}
      </header>

      <RenderedContent html={post.contentHtml} />
    </article>
  );
}
