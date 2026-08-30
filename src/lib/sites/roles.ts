/**
 * Roles and plans as plain data. Kept free of Drizzle so client components can
 * use the types without pulling the database layer into the browser bundle.
 */
export const SITE_ROLES = ['owner', 'admin', 'editor', 'author'] as const;
export const SITE_PLANS = ['free', 'pro'] as const;

export type SiteRole = (typeof SITE_ROLES)[number];
export type SitePlan = (typeof SITE_PLANS)[number];

/** Role ranking, highest first. Used to decide what a member may do. */
const ROLE_RANK: Record<SiteRole, number> = { owner: 3, admin: 2, editor: 1, author: 0 };

export function roleAtLeast(role: SiteRole, minimum: SiteRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export const ROLE_LABELS: Record<SiteRole, string> = {
  owner: 'Eigentümer:in',
  admin: 'Administration',
  editor: 'Redaktion',
  author: 'Autor:in',
};
