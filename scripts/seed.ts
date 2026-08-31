/**
 * Development seed: 1 user, 1 site, 5 posts, 3 images.
 *
 * The tables these records live in are introduced phase by phase, so this
 * script grows with the schema. It is idempotent and refuses to touch a
 * production database.
 */
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const SEED_EMAIL = 'demo@example.com';
const SEED_SUBDOMAIN = 'demo';
const SEED_SITE_NAME = 'Demo Site';
const SEED_PASSWORD = 'demo-password-123';
const SEED_NAME = 'Demo Nutzerin';

const SEED_POSTS: { title: string; body: string[]; type: 'post' | 'page'; publish: boolean }[] = [
  {
    title: 'Willkommen bei webpresslite',
    body: [
      'Diese Site ist mit dem Seed-Skript entstanden.',
      'Sie zeigt, wie ein veröffentlichter Beitrag im Frontend aussieht.',
    ],
    type: 'post',
    publish: true,
  },
  {
    title: 'Schreiben im Editor',
    body: ['Der Editor speichert automatisch, während du tippst.'],
    type: 'post',
    publish: true,
  },
  {
    title: 'Beiträge planen',
    body: ['Ein geplanter Beitrag wird vom Cronjob automatisch veröffentlicht.'],
    type: 'post',
    publish: true,
  },
  {
    title: 'Noch ein Entwurf',
    body: ['Dieser Beitrag ist absichtlich unveröffentlicht.'],
    type: 'post',
    publish: false,
  },
  {
    title: 'Über diese Site',
    body: ['Eine statische Seite liegt direkt unter der Subdomain, ohne Präfix.'],
    type: 'page',
    publish: true,
  },
];

function paragraphs(lines: string[]) {
  return {
    type: 'doc',
    content: lines.map((text) => ({ type: 'paragraph', content: [{ type: 'text', text }] })),
  };
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database.');
  }

  const { getDb } = await import('../src/lib/db/client');
  const { sites, user } = await import('../src/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  const existing = await getDb().select().from(user).where(eq(user.email, SEED_EMAIL)).limit(1);
  let userId = existing[0]?.id;

  if (userId) {
    console.info(`Seed user ${SEED_EMAIL} already exists.`);
  } else {
    // Going through the Better Auth API rather than inserting rows keeps the
    // password hashing identical to a real registration.
    const { getAuth } = await import('../src/lib/auth/server');
    await getAuth().api.signUpEmail({
      body: { name: SEED_NAME, email: SEED_EMAIL, password: SEED_PASSWORD },
    });

    const created = await getDb().select().from(user).where(eq(user.email, SEED_EMAIL)).limit(1);
    userId = created[0]?.id;
    console.info(`Created seed user ${SEED_EMAIL} (password: ${SEED_PASSWORD})`);
  }

  if (!userId) throw new Error('Seed user could not be created.');

  const { createSite, isSubdomainAvailable } = await import('../src/lib/db/queries/sites');

  if (await isSubdomainAvailable(SEED_SUBDOMAIN)) {
    const site = await createSite({
      name: SEED_SITE_NAME,
      subdomain: SEED_SUBDOMAIN,
      ownerId: userId,
    });
    console.info(`Created seed site ${site.subdomain} (${site.id})`);
  } else {
    console.info(`Seed site ${SEED_SUBDOMAIN} already exists.`);
  }

  const { createPost, listPosts, setPostStatus, updatePost } =
    await import('../src/lib/db/queries/posts');

  const siteId = (
    await getDb().select().from(sites).where(eq(sites.subdomain, SEED_SUBDOMAIN)).limit(1)
  )[0]?.id;
  if (!siteId) throw new Error('Seed site could not be resolved.');

  const existingPosts = await listPosts(siteId, userId);

  if (existingPosts.length === 0) {
    for (const [index, entry] of SEED_POSTS.entries()) {
      const post = await createPost({ siteId, userId, title: entry.title, type: entry.type });

      await updatePost({
        siteId,
        postId: post.id,
        userId,
        content: paragraphs(entry.body),
      });

      if (entry.publish) {
        // Stagger the dates so the archive has something to sort.
        await setPostStatus(
          siteId,
          post.id,
          userId,
          'published',
          new Date(Date.now() - (SEED_POSTS.length - index) * 24 * 60 * 60 * 1000),
        );
      }
    }

    console.info(`Created ${SEED_POSTS.length} seed posts.`);
  } else {
    console.info(`Site ${SEED_SUBDOMAIN} already has ${existingPosts.length} entries.`);
  }

  await seedMedia(siteId, userId);
  await seedTaxonomiesAndComments(siteId, userId);
  await seedPageViews(siteId);
}

/** Thirty days of view counts, so the statistics page has something to show. */
async function seedPageViews(siteId: string) {
  const { getDb } = await import('../src/lib/db/client');
  const { pageViews, posts } = await import('../src/lib/db/schema');
  const { and, eq } = await import('drizzle-orm');

  const existing = await getDb()
    .select({ day: pageViews.day })
    .from(pageViews)
    .where(eq(pageViews.siteId, siteId))
    .limit(1);

  if (existing.length > 0) {
    console.info('Site already has view statistics.');
    return;
  }

  const published = await getDb()
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.siteId, siteId), eq(posts.status, 'published')));

  const rows: { siteId: string; postId: string | null; day: string; count: number }[] = [];

  for (let offset = 29; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - offset);
    const day = date.toISOString().slice(0, 10);

    // A gentle upward trend with weekday variation, so the chart is readable
    // rather than a flat line of identical bars.
    const base = 12 + Math.round((29 - offset) * 0.7);
    const weekday = date.getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.6 : 1;

    rows.push({ siteId, postId: null, day, count: Math.round(base * weekend) });

    for (const [index, post] of published.entries()) {
      const share = Math.round((base * weekend) / (index + 2));
      if (share > 0) rows.push({ siteId, postId: post.id, day, count: share });
    }
  }

  await getDb().insert(pageViews).values(rows);
  console.info(`Created ${rows.length} view rows across 30 days.`);
}

/** One category, a few tags and one comment in each moderation state. */
async function seedTaxonomiesAndComments(siteId: string, userId: string) {
  const { getDb } = await import('../src/lib/db/client');
  const { categories, comments, posts } = await import('../src/lib/db/schema');
  const { and, eq } = await import('drizzle-orm');
  const { createCategory, setPostCategory, setPostTags } =
    await import('../src/lib/db/queries/taxonomies');

  const existingCategories = await getDb()
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.siteId, siteId));

  if (existingCategories.length === 0) {
    const category = await createCategory({
      siteId,
      userId,
      name: 'Aus der Werkstatt',
      description: 'Wie diese Plattform entsteht.',
    });

    const published = await getDb()
      .select({ id: posts.id, title: posts.title })
      .from(posts)
      .where(and(eq(posts.siteId, siteId), eq(posts.type, 'post')));

    for (const post of published) {
      await setPostCategory({ siteId, userId, postId: post.id, categoryId: category.id });
      await setPostTags({ siteId, userId, postId: post.id, tagNames: ['webpresslite', 'Notizen'] });
    }

    console.info('Created seed category and tags.');
  }

  const existingComments = await getDb()
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.siteId, siteId));

  if (existingComments.length > 0) {
    console.info(`Site already has ${existingComments.length} comments.`);
    return;
  }

  const target = (
    await getDb()
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.siteId, siteId), eq(posts.status, 'published')))
      .limit(1)
  )[0];

  if (!target) return;

  const { randomBytes } = await import('node:crypto');
  await getDb()
    .insert(comments)
    .values([
      {
        id: randomBytes(16).toString('hex'),
        postId: target.id,
        siteId,
        authorName: 'Freigegebene Leserin',
        authorEmail: 'leserin@example.com',
        body: 'Dieser Kommentar ist freigegeben und daher öffentlich sichtbar.',
        status: 'approved',
      },
      {
        id: randomBytes(16).toString('hex'),
        postId: target.id,
        siteId,
        authorName: 'Wartender Leser',
        authorEmail: 'leser@example.com',
        body: 'Dieser Kommentar wartet auf Freigabe und ist noch nicht sichtbar.',
        status: 'pending',
      },
    ]);

  console.info('Created 2 seed comments (1 approved, 1 pending).');
}

/**
 * Three generated images, so the media library is not empty on a fresh
 * install. They are drawn with `sharp` rather than committed as binaries.
 */
async function seedMedia(siteId: string, userId: string) {
  const { getDb } = await import('../src/lib/db/client');
  const { media } = await import('../src/lib/db/schema');
  const { eq } = await import('drizzle-orm');

  const existing = await getDb()
    .select({ id: media.id })
    .from(media)
    .where(eq(media.siteId, siteId));
  if (existing.length > 0) {
    console.info(`Site already has ${existing.length} media entries.`);
    return;
  }

  const sharp = (await import('sharp')).default;
  const { startUpload, finishUpload, updateAltText } = await import('../src/lib/db/queries/media');
  const { putObject } = await import('../src/lib/storage/objects');
  const { originalKey } = await import('../src/lib/media/keys');

  const images = [
    { name: 'sonnenaufgang.jpg', alt: 'Abstrakter Sonnenaufgang in Orange', color: '#e8891f' },
    { name: 'meer.jpg', alt: 'Abstrakte Meeresfläche in Blau', color: '#1f6ee8' },
    { name: 'wald.jpg', alt: 'Abstrakte Waldfläche in Grün', color: '#2e8b4f' },
  ];

  for (const image of images) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
      <rect width="1200" height="800" fill="${image.color}"/>
      <circle cx="380" cy="300" r="200" fill="#ffffff" opacity="0.25"/>
      <rect x="700" y="420" width="380" height="260" fill="#000000" opacity="0.2"/>
    </svg>`;

    const bytes = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();

    // The seed writes the original directly instead of going through a
    // presigned URL, then runs the same processing the app runs.
    const ticket = await startUpload({
      siteId,
      userId,
      fileName: image.name,
      mimeType: 'image/jpeg',
      size: bytes.byteLength,
    });

    await putObject({
      key: originalKey(siteId, ticket.mediaId, 'image/jpeg'),
      body: bytes,
      contentType: 'image/jpeg',
    });

    await finishUpload({ siteId, userId, mediaId: ticket.mediaId });
    await updateAltText({ siteId, userId, mediaId: ticket.mediaId, alt: image.alt });
  }

  console.info(`Created ${images.length} seed images.`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
