import { describe, expect, it } from 'vitest';
import { customDomainSchema, verificationHost, verificationRecord } from '@/lib/domains/validation';
import { PLAN_LIMITS, checkLimit, limitsFor } from '@/lib/sites/plans';
import { SITE_PLANS } from '@/lib/sites/roles';

describe('plan limits', () => {
  it('defines every limit for every plan', () => {
    for (const plan of SITE_PLANS) {
      const limits = limitsFor(plan);
      expect(limits.postsPerSite).toBeGreaterThan(0);
      expect(limits.mediaPerSite).toBeGreaterThan(0);
      expect(limits.membersPerSite).toBeGreaterThan(0);
      expect(typeof limits.customDomain).toBe('boolean');
    }
  });

  it('never gives free more than pro', () => {
    const free = PLAN_LIMITS.free;
    const pro = PLAN_LIMITS.pro;

    expect(pro.postsPerSite).toBeGreaterThanOrEqual(free.postsPerSite);
    expect(pro.mediaPerSite).toBeGreaterThanOrEqual(free.mediaPerSite);
    expect(pro.membersPerSite).toBeGreaterThanOrEqual(free.membersPerSite);
  });

  it('keeps custom domains out of the free plan', () => {
    expect(PLAN_LIMITS.free.customDomain).toBe(false);
    expect(PLAN_LIMITS.pro.customDomain).toBe(true);
  });

  it('treats the limit as exclusive: at the limit, nothing more is allowed', () => {
    expect(checkLimit(9, 10).allowed).toBe(true);
    expect(checkLimit(10, 10).allowed).toBe(false);
    expect(checkLimit(11, 10).allowed).toBe(false);
  });
});

describe('customDomainSchema', () => {
  it.each(['meineseite.de', 'blog.meineseite.de', 'my-site.co.uk', 'a-b.example'])(
    'accepts %s',
    (value) => {
      expect(customDomainSchema.safeParse(value).success).toBe(true);
    },
  );

  it('lowercases and trims', () => {
    const result = customDomainSchema.safeParse('  MeineSeite.DE  ');
    expect(result.success && result.data).toBe('meineseite.de');
  });

  it.each([
    ['https://meineseite.de', 'scheme'],
    ['meineseite.de/blog', 'path'],
    ['meineseite.de:3000', 'port'],
    ['meineseite', 'single label'],
    ['-meineseite.de', 'leading hyphen'],
    ['meineseite-.de', 'trailing hyphen'],
    ['meine seite.de', 'space'],
    ['meineseite..de', 'empty label'],
  ])('rejects %s (%s)', (value) => {
    expect(customDomainSchema.safeParse(value).success).toBe(false);
  });
});

describe('verification record', () => {
  it('lives on a dedicated subdomain so it cannot clash with other records', () => {
    expect(verificationHost('meineseite.de')).toBe('_webpresslite.meineseite.de');
  });

  it('is prefixed, so an unrelated TXT value never matches by accident', () => {
    expect(verificationRecord('abc123')).toBe('webpresslite-site-verification=abc123');
  });
});
