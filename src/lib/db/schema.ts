import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { JSONContent } from '@/lib/editor/types';
import type { ThemeSettings } from '@/lib/themes/settings';
import { COMMENT_STATUSES } from '@/lib/comments/constants';
import { POST_STATUSES, POST_TYPES } from '@/lib/posts/constants';
import { SITE_PLANS, SITE_ROLES } from '@/lib/sites/roles';
import { DEFAULT_THEME } from '@/lib/themes/definitions';

/**
 * Drizzle schema. Tables are added phase by phase: auth tables here in phase 1,
 * `sites` and `site_members` in phase 2, content tables from phase 3 onwards.
 *
 * The auth tables mirror Better Auth's core models. The property names must
 * match Better Auth's field names exactly — the Drizzle adapter looks columns
 * up by them — while the database columns stay snake_case.
 */
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    ...timestamps,
  },
  (table) => [uniqueIndex('user_email_unique').on(table.email)],
);

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('session_token_unique').on(table.token),
    index('session_user_id_idx').on(table.userId),
  ],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    issuer: text('issuer').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
      mode: 'date',
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
      mode: 'date',
    }),
    scope: text('scope'),
    password: text('password'),
    ...timestamps,
  },
  (table) => [
    index('account_user_id_idx').on(table.userId),
    uniqueIndex('account_provider_account_unique').on(table.providerId, table.accountId),
  ],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    ...timestamps,
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

// --- Sites and membership ---------------------------------------------------

export const siteRole = pgEnum('site_role', SITE_ROLES);
export const sitePlan = pgEnum('site_plan', SITE_PLANS);

export const sites = pgTable(
  'sites',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    subdomain: text('subdomain').notNull(),
    customDomain: text('custom_domain'),
    /** Random value the owner publishes as a TXT record to prove ownership. */
    domainVerificationToken: text('domain_verification_token'),
    domainVerifiedAt: timestamp('domain_verified_at', { withTimezone: true, mode: 'date' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    theme: text('theme').notNull().default(DEFAULT_THEME),
    themeSettings: jsonb('theme_settings').$type<ThemeSettings>().notNull().default({}),
    plan: sitePlan('plan').notNull().default('free'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('sites_subdomain_unique').on(table.subdomain),
    uniqueIndex('sites_custom_domain_unique').on(table.customDomain),
    index('sites_owner_id_idx').on(table.ownerId),
  ],
);

export const siteMembers = pgTable(
  'site_members',
  {
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: siteRole('role').notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.siteId, table.userId] }),
    index('site_members_user_id_idx').on(table.userId),
  ],
);

// --- Team invitations --------------------------------------------------------

export const siteInvitations = pgTable(
  'site_invitations',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: siteRole('role').notNull(),
    /** Hashed, never stored in the clear — the mail carries the only copy. */
    tokenHash: text('token_hash').notNull(),
    invitedBy: text('invited_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('site_invitations_token_unique').on(table.tokenHash),
    index('site_invitations_site_idx').on(table.siteId),
    index('site_invitations_email_idx').on(table.email),
  ],
);

// --- Statistics --------------------------------------------------------------

/**
 * Aggregated on write: one row per site, post and day, incremented in place.
 * No raw events are kept — the plan asks for reach, not for a trail of who
 * read what.
 */
export const pageViews = pgTable(
  'page_views',
  {
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    postId: text('post_id').references(() => posts.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [
    /**
     * A unique index rather than a primary key: `post_id` is null for a view of
     * the site itself, and a primary key column cannot be null. `nulls not
     * distinct` (Postgres 15+) makes those null rows collide with each other,
     * which is exactly what the upsert needs.
     */
    unique('page_views_key').on(table.siteId, table.day, table.postId).nullsNotDistinct(),
    index('page_views_site_day_idx').on(table.siteId, table.day),
  ],
);

// --- Taxonomies --------------------------------------------------------------

export const categories = pgTable(
  'categories',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('categories_site_slug_unique').on(table.siteId, table.slug),
    index('categories_site_idx').on(table.siteId),
  ],
);

export const tags = pgTable(
  'tags',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('tags_site_slug_unique').on(table.siteId, table.slug),
    index('tags_site_idx').on(table.siteId),
  ],
);

// --- Media -------------------------------------------------------------------

export const media = pgTable(
  'media',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    key: text('key').notNull(),
    mime: text('mime').notNull(),
    fileName: text('file_name').notNull(),
    width: integer('width'),
    height: integer('height'),
    size: integer('size').notNull().default(0),
    alt: text('alt'),
    /** Set once the variants exist; until then the upload is incomplete. */
    processedAt: timestamp('processed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('media_key_unique').on(table.key),
    index('media_site_created_idx').on(table.siteId, table.createdAt),
  ],
);

// --- Comments ----------------------------------------------------------------

export const commentStatus = pgEnum('comment_status', COMMENT_STATUSES);

// --- Content -----------------------------------------------------------------

export const postType = pgEnum('post_type', POST_TYPES);
export const postStatus = pgEnum('post_status', POST_STATUSES);

export const posts = pgTable(
  'posts',
  {
    id: text('id').primaryKey(),
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    authorId: text('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    type: postType('type').notNull().default('post'),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    excerpt: text('excerpt'),
    contentJson: jsonb('content_json').$type<JSONContent>().notNull(),
    contentHtml: text('content_html').notNull(),
    coverMediaId: text('cover_media_id').references(() => media.id, { onDelete: 'set null' }),
    /**
     * A post has at most one category and any number of tags — the same split
     * WordPress uses, and what the data model in the project brief implies by
     * giving tags a join table and categories none.
     */
    categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
    /**
     * Plain text of the document, kept alongside the JSON so full text search
     * does not have to walk the editor tree at query time.
     */
    contentText: text('content_text').notNull().default(''),
    status: postStatus('status').notNull().default('draft'),
    /**
     * For a published post the moment it went live, for a scheduled one the
     * moment it is due. One column covers both, so the cron job is a single
     * query and there is no second timestamp to keep in sync.
     */
    publishedAt: timestamp('published_at', { withTimezone: true, mode: 'date' }),
    seoTitle: text('seo_title'),
    seoDescription: text('seo_description'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('posts_site_slug_unique').on(table.siteId, table.slug),
    index('posts_site_status_published_idx').on(table.siteId, table.status, table.publishedAt),
    index('posts_author_id_idx').on(table.authorId),
    index('posts_category_idx').on(table.categoryId),
    /**
     * Full text search, scoped by site at query time. The expression must match
     * `postsSearchVector` in the search query exactly, otherwise Postgres
     * cannot use this index.
     */
    index('posts_search_idx').using(
      'gin',
      sql`to_tsvector('german', ${table.title} || ' ' || coalesce(${table.excerpt}, '') || ' ' || ${table.contentText})`,
    ),
  ],
);

export const postTags = pgTable(
  'post_tags',
  {
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId] }),
    index('post_tags_tag_idx').on(table.tagId),
  ],
);

export const comments = pgTable(
  'comments',
  {
    id: text('id').primaryKey(),
    postId: text('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    /**
     * Denormalised from the post so moderation can be scoped to a site without
     * joining, and so a comment can never be read across tenants by id alone.
     */
    siteId: text('site_id')
      .notNull()
      .references(() => sites.id, { onDelete: 'cascade' }),
    authorName: text('author_name').notNull(),
    authorEmail: text('author_email').notNull(),
    body: text('body').notNull(),
    status: commentStatus('status').notNull().default('pending'),
    ipHash: text('ip_hash'),
    ...timestamps,
  },
  (table) => [
    index('comments_post_status_idx').on(table.postId, table.status),
    index('comments_site_status_idx').on(table.siteId, table.status, table.createdAt),
  ],
);

export type UserRow = typeof user.$inferSelect;
export type SessionRow = typeof session.$inferSelect;
export type SiteRow = typeof sites.$inferSelect;
export type SiteMemberRow = typeof siteMembers.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type TagRow = typeof tags.$inferSelect;
export type CommentRow = typeof comments.$inferSelect;
export type SiteInvitationRow = typeof siteInvitations.$inferSelect;
export type PageViewRow = typeof pageViews.$inferSelect;
export type { CommentStatus } from '@/lib/comments/constants';
export type { PostStatus, PostType } from '@/lib/posts/constants';
export type { SitePlan, SiteRole } from '@/lib/sites/roles';
