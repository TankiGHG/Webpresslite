import 'server-only';
import type { SitePlan } from '@/lib/sites/roles';

/**
 * Stub for a payment provider.
 *
 * The plan is a property of the site and is enforced everywhere, but nobody is
 * charged: this module is the single seam where a real provider would be
 * wired in. It is deliberately a narrow interface — starting a checkout and
 * reporting what a site is entitled to — so swapping it does not touch the
 * rest of the application.
 */
export interface CheckoutSession {
  provider: 'stub';
  url: string;
  plan: SitePlan;
}

export interface BillingProvider {
  startCheckout(input: { siteId: string; plan: SitePlan }): Promise<CheckoutSession>;
  /** What the provider believes the site is entitled to. */
  entitlement(siteId: string): Promise<SitePlan | null>;
}

export const billing: BillingProvider = {
  async startCheckout({ siteId, plan }) {
    // A real provider returns a hosted checkout URL here. The stub points back
    // at the plan page so the flow stays walkable end to end.
    return { provider: 'stub', url: `/sites/${siteId}/plan?checkout=${plan}`, plan };
  },

  async entitlement() {
    // Without a provider there is nothing to reconcile against; the value
    // stored on the site is the source of truth.
    return null;
  },
};
