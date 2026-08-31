import type { SitePlan } from './roles';

/**
 * Plan limits as data. Enforcement lives in the query layer, so a limit cannot
 * be bypassed by calling a different entry point.
 *
 * There is no payment provider behind this — `src/lib/billing/stub.ts` is the
 * seam a real one would slot into.
 */
/**
 * Every limit is per site, because that is where the plan lives. A cap on how
 * many sites one person may own has no plan to read — a site that does not
 * exist yet has none — so it is deliberately absent rather than enforced
 * against a hardcoded tier.
 */
export interface PlanLimits {
  /** Posts and pages per site. */
  postsPerSite: number;
  /** Media items per site. */
  mediaPerSite: number;
  /** Team members per site, the owner included. */
  membersPerSite: number;
  customDomain: boolean;
}

export const PLAN_LIMITS: Record<SitePlan, PlanLimits> = {
  free: {
    postsPerSite: 50,
    mediaPerSite: 100,
    membersPerSite: 2,
    customDomain: false,
  },
  pro: {
    postsPerSite: 5000,
    mediaPerSite: 5000,
    membersPerSite: 25,
    customDomain: true,
  },
};

export const PLAN_LABELS: Record<SitePlan, string> = { free: 'Free', pro: 'Pro' };

export function limitsFor(plan: SitePlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export interface LimitCheck {
  allowed: boolean;
  limit: number;
  used: number;
}

export function checkLimit(used: number, limit: number): LimitCheck {
  return { allowed: used < limit, limit, used };
}
