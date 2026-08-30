import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { JSONContent } from '@/lib/editor/types';
import { POST_STATUSES, POST_TYPES } from '@/lib/posts/constants';
import { SITE_PLANS, SITE_ROLES } from '@/lib/sites/roles';

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

export interface ThemeSettings {
  colors?: Record<string, string>;
  fontFamily?: string;
  logoMediaId?: string;
}

export const sites = pgTable(
  'sites',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    subdomain: text('subdomain').notNull(),
    customDomain: text('custom_domain'),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    theme: text('theme').notNull().default('minimal'),
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
    coverMediaId: text('cover_media_id'),
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
  ],
);

export type UserRow = typeof user.$inferSelect;
export type SessionRow = typeof session.$inferSelect;
export type SiteRow = typeof sites.$inferSelect;
export type SiteMemberRow = typeof siteMembers.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type { PostStatus, PostType } from '@/lib/posts/constants';
export type { SitePlan, SiteRole } from '@/lib/sites/roles';
