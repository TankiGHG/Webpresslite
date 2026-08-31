import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CommentForm } from '@/components/comments/comment-form';
import { RenderedContent } from '@/components/editor/rendered-content';
import { after } from 'next/server';
import { listApprovedComments } from '@/lib/db/queries/comments';
import { recordView } from '@/lib/db/queries/stats';
import {
  getPostCategory,
  getPublicPostTags,
  getPublicSite,
  getPublishedPost,
} from '@/lib/db/queries/public-sites';
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

  const [category, tagsByPost, comments] = await Promise.all([
    getPostCategory(siteId, post.categoryId),
    getPublicPostTags([post.id]),
    listApprovedComments(post.id),
  ]);
  const postTags = tagsByPost.get(post.id) ?? [];

  // Counted after the response is sent, so a slow write never delays a reader.
  after(async () => {
    await recordView({ siteId, postId: post.id });
  });

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

      {category || postTags.length > 0 ? (
        <nav className="post-taxonomies" aria-label="Einordnung" data-testid="post-taxonomies">
          {category ? <Link href={`/kategorie/${category.slug}`}>{category.name}</Link> : null}
          {postTags.map((tag) => (
            <Link key={tag.slug} href={`/tag/${tag.slug}`}>
              #{tag.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <section className="comment-section" data-testid="comments">
        <h2>
          {comments.length === 0
            ? 'Kommentare'
            : `${comments.length} ${comments.length === 1 ? 'Kommentar' : 'Kommentare'}`}
        </h2>

        {comments.length > 0 ? (
          <ul className="comment-list" data-testid="comment-list">
            {comments.map((comment) => (
              <li key={comment.id} className="comment-item">
                <header>
                  <strong>{comment.authorName}</strong>
                  <time dateTime={comment.createdAt.toISOString()}>
                    {comment.createdAt.toLocaleDateString('de-DE')}
                  </time>
                </header>
                {/* Plain text, rendered as text — a comment never contains markup. */}
                <p>{comment.body}</p>
              </li>
            ))}
          </ul>
        ) : null}

        <CommentForm siteId={siteId} postSlug={post.slug} />
      </section>
    </article>
  );
}
