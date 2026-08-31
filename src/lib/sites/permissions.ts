import { SITE_ROLES, type SiteRole } from './roles';

/**
 * The permission matrix, written out rather than derived from a role ranking.
 *
 * A ranking answers "is this role at least X"; it does not answer "may an
 * editor change the theme". Spelling every capability out makes the answer
 * readable, greppable and testable, and a new capability cannot silently
 * inherit rights nobody granted it.
 */
export const CAPABILITIES = [
  'post:create',
  'post:edit-own',
  'post:edit-any',
  'post:publish',
  'post:delete',
  'media:upload',
  'media:delete',
  'taxonomy:manage',
  'comment:moderate',
  'stats:view',
  'site:settings',
  'site:design',
  'site:members',
  'site:domain',
  'site:plan',
  'site:delete',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const AUTHOR: Capability[] = ['post:create', 'post:edit-own', 'media:upload'];

const EDITOR: Capability[] = [
  ...AUTHOR,
  'post:edit-any',
  'post:publish',
  'post:delete',
  'media:delete',
  'taxonomy:manage',
  'comment:moderate',
  'stats:view',
];

const ADMIN: Capability[] = [...EDITOR, 'site:settings', 'site:design', 'site:members'];

const OWNER: Capability[] = [...ADMIN, 'site:domain', 'site:plan', 'site:delete'];

export const ROLE_CAPABILITIES: Record<SiteRole, readonly Capability[]> = {
  author: AUTHOR,
  editor: EDITOR,
  admin: ADMIN,
  owner: OWNER,
};

export function can(role: SiteRole, capability: Capability): boolean {
  return ROLE_CAPABILITIES[role].includes(capability);
}

/** Human readable matrix, rendered on the members page. */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  'post:create': 'Beiträge schreiben',
  'post:edit-own': 'Eigene Beiträge bearbeiten',
  'post:edit-any': 'Fremde Beiträge bearbeiten',
  'post:publish': 'Veröffentlichen',
  'post:delete': 'Beiträge löschen',
  'media:upload': 'Medien hochladen',
  'media:delete': 'Medien löschen',
  'taxonomy:manage': 'Kategorien und Tags verwalten',
  'comment:moderate': 'Kommentare moderieren',
  'stats:view': 'Statistik einsehen',
  'site:settings': 'Site-Einstellungen ändern',
  'site:design': 'Design ändern',
  'site:members': 'Team verwalten',
  'site:domain': 'Custom Domain verwalten',
  'site:plan': 'Plan ändern',
  'site:delete': 'Site löschen',
};

/** Roles a given role may hand out. Nobody can grant more than they hold. */
export function assignableRoles(actor: SiteRole): SiteRole[] {
  if (actor === 'owner') return ['admin', 'editor', 'author'];
  if (actor === 'admin') return ['editor', 'author'];
  return [];
}

export { SITE_ROLES };
