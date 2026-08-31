import { describe, expect, it } from 'vitest';
import {
  assignableRoles,
  CAPABILITIES,
  CAPABILITY_LABELS,
  ROLE_CAPABILITIES,
  can,
} from '@/lib/sites/permissions';
import { SITE_ROLES, roleAtLeast } from '@/lib/sites/roles';

describe('permission matrix', () => {
  it('labels every capability', () => {
    for (const capability of CAPABILITIES) {
      expect(CAPABILITY_LABELS[capability], capability).toBeTruthy();
    }
  });

  it('grants no capability outside the declared list', () => {
    for (const role of SITE_ROLES) {
      for (const capability of ROLE_CAPABILITIES[role]) {
        expect(CAPABILITIES, `${role}/${capability}`).toContain(capability);
      }
    }
  });

  it('is strictly cumulative: a senior role holds everything a junior one does', () => {
    const order = ['author', 'editor', 'admin', 'owner'] as const;

    for (let index = 1; index < order.length; index += 1) {
      const junior = order[index - 1]!;
      const senior = order[index]!;

      for (const capability of ROLE_CAPABILITIES[junior]) {
        expect(can(senior, capability), `${senior} lacks ${capability}`).toBe(true);
      }
    }
  });

  it('lets an author write but not publish', () => {
    expect(can('author', 'post:create')).toBe(true);
    expect(can('author', 'post:edit-own')).toBe(true);
    expect(can('author', 'post:publish')).toBe(false);
    expect(can('author', 'post:delete')).toBe(false);
  });

  it('lets an editor run the content side but not the site settings', () => {
    expect(can('editor', 'post:publish')).toBe(true);
    expect(can('editor', 'comment:moderate')).toBe(true);
    expect(can('editor', 'taxonomy:manage')).toBe(true);
    expect(can('editor', 'stats:view')).toBe(true);

    // This is the acceptance criterion of the phase, stated as code.
    expect(can('editor', 'site:settings')).toBe(false);
    expect(can('editor', 'site:design')).toBe(false);
    expect(can('editor', 'site:members')).toBe(false);
    expect(can('editor', 'site:domain')).toBe(false);
    expect(can('editor', 'site:plan')).toBe(false);
    expect(can('editor', 'site:delete')).toBe(false);
  });

  it('reserves domain, plan and deletion for the owner', () => {
    for (const capability of ['site:domain', 'site:plan', 'site:delete'] as const) {
      expect(can('owner', capability)).toBe(true);
      expect(can('admin', capability), capability).toBe(false);
    }
  });

  it('lets an admin manage members and design but not delete the site', () => {
    expect(can('admin', 'site:members')).toBe(true);
    expect(can('admin', 'site:design')).toBe(true);
    expect(can('admin', 'site:delete')).toBe(false);
  });
});

describe('assignableRoles', () => {
  it('never lets anyone grant more than they hold', () => {
    for (const actor of SITE_ROLES) {
      for (const granted of assignableRoles(actor)) {
        expect(roleAtLeast(actor, granted), `${actor} -> ${granted}`).toBe(true);
        expect(granted).not.toBe('owner');
      }
    }
  });

  it('gives editors and authors nothing to hand out', () => {
    expect(assignableRoles('editor')).toEqual([]);
    expect(assignableRoles('author')).toEqual([]);
  });

  it('lets an admin appoint editors and authors, but no admins', () => {
    expect(assignableRoles('admin')).toEqual(['editor', 'author']);
  });
});
